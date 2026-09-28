import { WatchParty } from '../models/WatchParty.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { Vote } from '../models/Vote.js';

// In-memory playback state cache to avoid writing to MongoDB on every frame
// partyId -> { currentTime, isPlaying, updatedAt, hostSocketId }
const partyPlaybackMemory = new Map();

export function setupSocketIO(io) {
  io.on('connection', (socket) => {
    let currentPartyId = null;
    let currentUser = null;

    // Join Watch Party Room
    socket.on('party:join', async ({ partyId, user }) => {
      if (!partyId) return;
      const normalizedPartyId = partyId.toLowerCase();
      currentPartyId = normalizedPartyId;
      currentUser = user || { name: 'Guest', id: socket.id };

      socket.join(normalizedPartyId);

      try {
        const party = await WatchParty.findOne({ partyId: normalizedPartyId }).populate('contentId');
        if (!party) {
          socket.emit('party:error', { message: 'Watch space does not exist.' });
          return;
        }

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

        // Send current synchronized state to joining client
        socket.emit('party:state', {
          party,
          playback: {
            currentTime: syncedTime,
            isPlaying: memState.isPlaying,
            updatedAt: Date.now(),
          },
          messages: recentMessages.reverse(),
        });

        // Broadcast participant joined event to room
        socket.to(normalizedPartyId).emit('party:participant_joined', {
          user: currentUser,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error in party:join socket handler:', err);
      }
    });

    // Playback: Play
    socket.on('playback:play', async ({ partyId, currentTime }) => {
      const pId = (partyId || currentPartyId)?.toLowerCase();
      if (!pId) return;

      const memState = partyPlaybackMemory.get(pId) || { hostId: null };
      memState.currentTime = Number(currentTime) || 0;
      memState.isPlaying = true;
      memState.updatedAt = Date.now();
      partyPlaybackMemory.set(pId, memState);

      // Broadcast to all participants in the party
      io.to(pId).emit('playback:update', {
        currentTime: memState.currentTime,
        isPlaying: true,
        updatedAt: memState.updatedAt,
      });

      // Periodically persist state to MongoDB
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
    });

    // Playback: Pause
    socket.on('playback:pause', async ({ partyId, currentTime }) => {
      const pId = (partyId || currentPartyId)?.toLowerCase();
      if (!pId) return;

      const memState = partyPlaybackMemory.get(pId) || { hostId: null };
      memState.currentTime = Number(currentTime) || 0;
      memState.isPlaying = false;
      memState.updatedAt = Date.now();
      partyPlaybackMemory.set(pId, memState);

      io.to(pId).emit('playback:update', {
        currentTime: memState.currentTime,
        isPlaying: false,
        updatedAt: memState.updatedAt,
      });

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
    });

    // Playback: Seek
    socket.on('playback:seek', async ({ partyId, currentTime }) => {
      const pId = (partyId || currentPartyId)?.toLowerCase();
      if (!pId) return;

      const memState = partyPlaybackMemory.get(pId) || { hostId: null };
      memState.currentTime = Number(currentTime) || 0;
      memState.updatedAt = Date.now();
      partyPlaybackMemory.set(pId, memState);

      io.to(pId).emit('playback:update', {
        currentTime: memState.currentTime,
        isPlaying: memState.isPlaying,
        updatedAt: memState.updatedAt,
      });
    });

    // Real-Time Chat Message
    socket.on('chat:message', async (data) => {
      const pId = (data.partyId || currentPartyId)?.toLowerCase();
      if (!pId || !data.message) return;

      try {
        const savedMessage = await ChatMessage.create({
          partyId: pId,
          userId: data.userId || currentUser?.id,
          userName: data.userName || currentUser?.name || 'Viewer',
          userAvatar: data.userAvatar || currentUser?.avatar || '',
          message: data.message.trim(),
          videoTime: Number(data.videoTime) || 0,
          type: data.type || 'chat',
        });

        // Broadcast to entire room including sender
        io.to(pId).emit('chat:message', savedMessage);
      } catch (err) {
        console.error('Error saving socket chat message:', err);
      }
    });

    // Real-Time Narrative Variation Vote
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

        // Tally all votes for this variation
        const allVotes = await Vote.find({ partyId: pId, variationId }).lean();
        const optionsTally = {};
        allVotes.forEach((v) => {
          optionsTally[v.optionId] = (optionsTally[v.optionId] || 0) + 1;
        });

        // Broadcast updated tally to all participants
        io.to(pId).emit('vote:update', {
          variationId,
          totalVotes: allVotes.length,
          optionsTally,
        });
      } catch (err) {
        console.error('Error processing socket vote:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentPartyId && currentUser) {
        socket.to(currentPartyId).emit('party:participant_left', {
          user: currentUser,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });
}
