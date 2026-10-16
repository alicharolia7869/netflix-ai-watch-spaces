import { WatchParty } from '../models/WatchParty.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { Vote } from '../models/Vote.js';

// In-memory playback state cache
// partyId -> { currentTime, isPlaying, updatedAt, hostId, hostSocketId }
const partyPlaybackMemory = new Map();

// In-memory active connected participants
// partyId -> Map of socketId -> { socketId, userId, name, avatar, role, isOnline, joinedAt }
const roomParticipants = new Map();

export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    let currentPartyId = null;
    let currentUser = null;

    // Helper: broadcast participant list
    const broadcastParticipantRoster = (partyId) => {
      const pId = partyId?.toLowerCase();
      if (!pId || !roomParticipants.has(pId)) return;
      const participants = Array.from(roomParticipants.get(pId).values());
      io.to(pId).emit('party:participants', participants);
    };

    // Helper: leave current party
    const handleLeaveParty = async () => {
      if (!currentPartyId) return;
      const pId = currentPartyId.toLowerCase();

      if (roomParticipants.has(pId)) {
        const pMap = roomParticipants.get(pId);
        const leavingParticipant = pMap.get(socket.id) || currentUser;
        pMap.delete(socket.id);

        socket.to(pId).emit('party:participant_left', {
          user: leavingParticipant,
          timestamp: new Date().toISOString(),
        });

        broadcastParticipantRoster(pId);

        if (pMap.size === 0) {
          roomParticipants.delete(pId);
        }
      }

      if (currentUser?.id) {
        WatchParty.updateOne(
          { partyId: pId, 'participants.userId': currentUser.id },
          { $set: { 'participants.$.isOnline': false } }
        ).catch(() => {});
      }

      socket.leave(pId);
      currentPartyId = null;
    };

    // 1. Join Watch Party Room
    socket.on('party:join', async ({ partyId, user }) => {
      if (!partyId) return;
      const normalizedPartyId = partyId.toLowerCase();

      // If user was previously in another room, leave it cleanly
      if (currentPartyId && currentPartyId !== normalizedPartyId) {
        await handleLeaveParty();
      }

      currentPartyId = normalizedPartyId;
      currentUser = user || { name: 'Guest', id: socket.id };

      // Resilient support for Solo Watch Spaces without requiring database party creation
      if (normalizedPartyId.startsWith('solo-') || normalizedPartyId === 'solo-space') {
        const soloRoomId = `${normalizedPartyId}-${socket.id}`;
        socket.join(soloRoomId);
        currentPartyId = soloRoomId;

        const participantRecord = {
          socketId: socket.id,
          userId: user?.id || socket.id,
          name: user?.name || 'Solo Viewer',
          avatar: user?.avatar || '',
          role: 'host',
          isOnline: true,
          joinedAt: new Date().toISOString(),
        };

        socket.emit('party:state', {
          party: {
            partyId: normalizedPartyId,
            title: 'Solo Watch Space',
            status: 'active',
            hostId: user?.id || socket.id,
          },
          playback: {
            currentTime: 0,
            isPlaying: false,
            updatedAt: Date.now(),
            serverTimestamp: Date.now(),
          },
          messages: [],
          participants: [participantRecord],
        });
        return;
      }

      socket.join(normalizedPartyId);

      try {
        const party = await WatchParty.findOne({ partyId: normalizedPartyId }).populate('contentId');
        if (!party) {
          socket.emit('party:error', { message: 'Watch space does not exist.' });
          return;
        }

        const isHost = party.hostId.toString() === (user?.id || '').toString();

        // Initialize in-memory playback if not present
        if (!partyPlaybackMemory.has(normalizedPartyId)) {
          partyPlaybackMemory.set(normalizedPartyId, {
            currentTime: party.playback?.currentTime || 0,
            isPlaying: party.playback?.isPlaying || false,
            updatedAt: party.playback?.updatedAt || Date.now(),
            hostId: party.hostId.toString(),
          });
        }

        const memState = partyPlaybackMemory.get(normalizedPartyId);

        // Calculate synchronized elapsed time if actively playing
        let syncedTime = memState.currentTime;
        if (memState.isPlaying) {
          const elapsedSec = (Date.now() - memState.updatedAt) / 1000;
          syncedTime += elapsedSec;
        }

        // Register participant in room roster
        if (!roomParticipants.has(normalizedPartyId)) {
          roomParticipants.set(normalizedPartyId, new Map());
        }

        const participantRecord = {
          socketId: socket.id,
          userId: user?.id || socket.id,
          name: user?.name || 'Viewer',
          avatar: user?.avatar || '',
          role: isHost ? 'host' : 'viewer',
          isOnline: true,
          joinedAt: new Date().toISOString(),
        };

        roomParticipants.get(normalizedPartyId).set(socket.id, participantRecord);

        // Update online status in database
        if (user && user.id) {
          await WatchParty.updateOne(
            { partyId: normalizedPartyId, 'participants.userId': user.id },
            { $set: { 'participants.$.isOnline': true } }
          );
        }

        // Fetch recent messages
        const recentMessages = await ChatMessage.find({ partyId: normalizedPartyId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        // Send current synchronized room state to joining client
        socket.emit('party:state', {
          party,
          playback: {
            currentTime: syncedTime,
            isPlaying: memState.isPlaying,
            updatedAt: Date.now(),
            serverTimestamp: Date.now(),
          },
          messages: recentMessages.reverse(),
          participants: Array.from(roomParticipants.get(normalizedPartyId).values()),
        });

        // Broadcast participant joined event to room
        socket.to(normalizedPartyId).emit('party:participant_joined', {
          user: participantRecord,
          timestamp: new Date().toISOString(),
        });

        // Broadcast complete updated roster
        broadcastParticipantRoster(normalizedPartyId);
      } catch (err) {
        console.error('Error in party:join socket handler:', err);
      }
    });

    // 2. Playback: Play (Host Authorized)
    socket.on('playback:play', async ({ partyId, currentTime }) => {
      const pId = (partyId || currentPartyId)?.toLowerCase();
      if (!pId) return;

      const memState = partyPlaybackMemory.get(pId) || { hostId: null };

      // Host control validation
      const isHost = !memState.hostId || memState.hostId === (currentUser?.id || '').toString() || pId === 'solo-space' || pId.startsWith('solo-');
      if (!isHost) {
        socket.emit('party:error', { message: 'Only the party host can control video playback.' });
        return;
      }

      memState.currentTime = Number(currentTime) || 0;
      memState.isPlaying = true;
      memState.updatedAt = Date.now();
      partyPlaybackMemory.set(pId, memState);

      io.to(pId).emit('playback:update', {
        currentTime: memState.currentTime,
        isPlaying: true,
        updatedAt: memState.updatedAt,
        serverTimestamp: Date.now(),
      });

      if (!pId.startsWith('solo-') && pId !== 'solo-space') {
        WatchParty.updateOne(
          { partyId: pId },
          {
            $set: {
              'playback.currentTime': memState.currentTime,
              'playback.isPlaying': true,
              'playback.updatedAt': memState.updatedAt,
            },
          }
        ).catch(() => {});
      }
    });

    // 3. Playback: Pause (Host Authorized)
    socket.on('playback:pause', async ({ partyId, currentTime }) => {
      const pId = (partyId || currentPartyId)?.toLowerCase();
      if (!pId) return;

      const memState = partyPlaybackMemory.get(pId) || { hostId: null };

      // Host control validation
      const isHost = !memState.hostId || memState.hostId === (currentUser?.id || '').toString() || pId === 'solo-space' || pId.startsWith('solo-');
      if (!isHost) {
        socket.emit('party:error', { message: 'Only the party host can control video playback.' });
        return;
      }

      memState.currentTime = Number(currentTime) || 0;
      memState.isPlaying = false;
      memState.updatedAt = Date.now();
      partyPlaybackMemory.set(pId, memState);

      io.to(pId).emit('playback:update', {
        currentTime: memState.currentTime,
        isPlaying: false,
        updatedAt: memState.updatedAt,
        serverTimestamp: Date.now(),
      });

      if (!pId.startsWith('solo-') && pId !== 'solo-space') {
        WatchParty.updateOne(
          { partyId: pId },
          {
            $set: {
              'playback.currentTime': memState.currentTime,
              'playback.isPlaying': false,
              'playback.updatedAt': memState.updatedAt,
            },
          }
        ).catch(() => {});
      }
    });

    // 4. Playback: Seek (Host Authorized)
    socket.on('playback:seek', async ({ partyId, currentTime }) => {
      const pId = (partyId || currentPartyId)?.toLowerCase();
      if (!pId) return;

      const memState = partyPlaybackMemory.get(pId) || { hostId: null };

      // Host control validation
      const isHost = !memState.hostId || memState.hostId === (currentUser?.id || '').toString() || pId === 'solo-space' || pId.startsWith('solo-');
      if (!isHost) {
        socket.emit('party:error', { message: 'Only the party host can control video playback.' });
        return;
      }

      memState.currentTime = Number(currentTime) || 0;
      memState.updatedAt = Date.now();
      partyPlaybackMemory.set(pId, memState);

      io.to(pId).emit('playback:update', {
        currentTime: memState.currentTime,
        isPlaying: memState.isPlaying,
        updatedAt: memState.updatedAt,
        serverTimestamp: Date.now(),
      });
    });

    // 5. Real-Time Chat Message (Sanitized, Length Limited)
    socket.on('chat:message', async (data) => {
      const pId = (data.partyId || currentPartyId)?.toLowerCase();
      if (!pId || !data.message) return;

      // Sanitize text and enforce max 500 characters
      let sanitizedMessage = String(data.message).trim().slice(0, 500);
      sanitizedMessage = sanitizedMessage.replace(/[<>]/g, '');
      if (!sanitizedMessage) return;

      if (pId.startsWith('solo-') || pId === 'solo-space') {
        socket.emit('chat:message', {
          _id: `msg-${Date.now()}`,
          partyId: pId,
          userId: data.userId || currentUser?.id,
          userName: data.userName || currentUser?.name || 'Viewer',
          userAvatar: data.userAvatar || currentUser?.avatar || '',
          message: sanitizedMessage,
          videoTime: Number(data.videoTime) || 0,
          createdAt: new Date().toISOString(),
          type: data.type || 'chat',
        });
        return;
      }

      try {
        const savedMessage = await ChatMessage.create({
          partyId: pId,
          userId: data.userId || currentUser?.id,
          userName: data.userName || currentUser?.name || 'Viewer',
          userAvatar: data.userAvatar || currentUser?.avatar || '',
          message: sanitizedMessage,
          videoTime: Number(data.videoTime) || 0,
          type: data.type || 'chat',
        });

        io.to(pId).emit('chat:message', savedMessage);
      } catch (err) {
        console.error('Error saving socket chat message:', err);
      }
    });

    // 6. Real-Time Emoji Reaction Dispatch
    socket.on('reaction:send', ({ partyId, emoji, user, id }) => {
      const pId = (partyId || currentPartyId)?.toLowerCase();
      if (!pId || !emoji) return;

      const reactionPayload = {
        id: id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        emoji: String(emoji).slice(0, 10),
        user: user || currentUser || { name: 'Viewer' },
        timestamp: Date.now(),
      };

      io.to(pId).emit('reaction:receive', reactionPayload);
    });

    // 7. Real-Time Narrative Variation Vote
    socket.on('vote:cast', async ({ partyId, variationId, optionId, user }) => {
      const pId = (partyId || currentPartyId)?.toLowerCase();
      if (!pId || !variationId || !optionId) return;

      try {
        const userId = user?.id || currentUser?.id;
        if (userId) {
          const existing = await Vote.findOne({ partyId: pId, userId, variationId });
          if (existing) {
            existing.optionId = optionId;
            await existing.save();
          } else {
            await Vote.create({
              partyId: pId,
              userId,
              userName: user?.name || currentUser?.name || 'Viewer',
              variationId,
              optionId,
            });
          }
        }

        const allVotes = await Vote.find({ partyId: pId, variationId }).lean();
        const optionsTally = {};
        allVotes.forEach((v) => {
          optionsTally[v.optionId] = (optionsTally[v.optionId] || 0) + 1;
        });

        io.to(pId).emit('vote:update', {
          variationId,
          totalVotes: allVotes.length,
          optionsTally,
        });
      } catch (err) {
        console.error('Error processing socket vote:', err);
      }
    });

    // 8. Leave Room
    socket.on('party:leave', handleLeaveParty);

    // 9. Disconnect cleanup
    socket.on('disconnect', handleLeaveParty);
  });
}
