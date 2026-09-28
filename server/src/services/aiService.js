import { Content } from '../models/Content.js';

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Detect the active scene and temporal context for a given playback timestamp.
 */
export async function getSceneContext(contentId, currentTime = 0) {
  const content = await Content.findById(contentId);
  if (!content) {
    throw new Error('Content not found');
  }

  const time = Number(currentTime) || 0;
  const scenes = content.scenes || [];

  // Find exact active scene
  let activeScene = scenes.find((s) => time >= s.startTime && time <= s.endTime);

  // If between or past known scenes, find closest or default
  if (!activeScene && scenes.length > 0) {
    activeScene = scenes.reduce((prev, curr) => {
      return Math.abs(curr.startTime - time) < Math.abs(prev.startTime - time) ? curr : prev;
    });
  }

  // Find prior scenes up to current time (for context like "what happened before this")
  const priorScenes = scenes.filter((s) => s.endTime <= time);

  return {
    contentTitle: content.title,
    contentGenre: content.genre,
    contentDescription: content.description,
    currentTime: time,
    formattedTime: formatTime(time),
    activeScene: activeScene || null,
    priorScenes: priorScenes.slice(-2), // last 2 scenes
    allTrivia: content.trivia || [],
    variations: content.variations || [],
  };
}

/**
 * Ask AI Co-Pilot a scene-grounded question.
 */
export async function askCoPilot({ contentId, currentTime = 0, question }) {
  if (!question || !question.trim()) {
    throw new Error('Question is required');
  }

  const context = await getSceneContext(contentId, currentTime);
  const { contentTitle, activeScene, formattedTime } = context;

  const sceneRange = activeScene
    ? `${formatTime(activeScene.startTime)} - ${formatTime(activeScene.endTime)}`
    : formattedTime;

  // Grounding knowledge construction
  const groundedContext = activeScene
    ? `
Movie: "${contentTitle}"
Current Timestamp: ${formattedTime}
Active Scene: "${activeScene.title}" (${sceneRange})
Scene Summary: ${activeScene.summary}
Characters in Scene: ${activeScene.characters?.join(', ') || 'N/A'}
Underlying Scene Lore/Context:
${activeScene.context?.map((c) => `- ${c}`).join('\n') || '- None documented'}
Key Dialogue:
${activeScene.keyDialogue?.map((d) => `${d.speaker}: "${d.line}"`).join('\n') || 'None recorded'}
`
    : `Movie: "${contentTitle}" at ${formattedTime}. No specific scene breakdown available for this frame.`;

  // If OPENAI_API_KEY is configured, call LLM
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(`${process.env.OPENAI_API_BASE || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are the Netflix AI Watch Space Co-Pilot. You provide intelligent, spoiler-free (beyond current timestamp), scene-grounded answers to viewers during live watch parties.
RULES:
1. Base your answer strictly on the provided Grounded Scene Context.
2. If the user asks about a character, explain who they are and their current objective in this scene.
3. If asked what happened or why someone did something, cite the timeline and scene events.
4. Keep answers concise (2-4 sentences max), cinematic, engaging, and directly helpful.
5. Include a brief timeline citation at the end in brackets, e.g. [Timeline Citation: Scene "Scene Name" 00:02:15 - 00:03:40].`,
            },
            {
              role: 'user',
              content: `GROUNDED SCENE CONTEXT:\n${groundedContext}\n\nVIEWER QUESTION: "${question}"`,
            },
          ],
          temperature: 0.3,
          max_tokens: 280,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content;
        if (answer) {
          return {
            answer: answer.trim(),
            scene: activeScene ? activeScene.title : 'General Movie',
            timeRange: sceneRange,
            characters: activeScene ? activeScene.characters : [],
            grounded: true,
            provider: 'llm',
          };
        }
      }
    } catch (err) {
      console.warn('LLM API call failed, falling back to deterministic grounded retriever:', err.message);
    }
  }

  // Grounded Deterministic Engine (Zero hallucination fallback)
  const q = question.toLowerCase();
  let answer = '';

  if (activeScene) {
    if (q.includes('who') || q.includes('character') || q.includes('actor')) {
      answer = `In this scene ("${activeScene.title}"), the active characters are ${activeScene.characters.join(', ')}. ${activeScene.summary} ${activeScene.context?.[0] || ''}`;
    } else if (q.includes('what happened') || q.includes('why') || q.includes('explain')) {
      answer = `At this point in the timeline (${sceneRange}), ${activeScene.summary} Key detail: ${activeScene.context?.[0] || 'The situation is evolving rapidly.'}`;
    } else if (q.includes('dialogue') || q.includes('said') || q.includes('say')) {
      const dialogueText = activeScene.keyDialogue?.length
        ? activeScene.keyDialogue.map((d) => `${d.speaker} said: "${d.line}"`).join(' ')
        : 'There is intense atmospheric tension rather than formal spoken dialogue here.';
      answer = `During "${activeScene.title}", ${dialogueText}`;
    } else {
      answer = `Currently in "${activeScene.title}" (${sceneRange}): ${activeScene.summary} Context: ${activeScene.context?.join(' ') || ''}`;
    }
  } else {
    answer = `You are watching "${contentTitle}" at timestamp ${formattedTime}. ${context.contentDescription}`;
  }

  return {
    answer: `${answer} [Timeline Citation: Scene "${activeScene?.title || 'Current'}" (${sceneRange})]`,
    scene: activeScene ? activeScene.title : 'General',
    timeRange: sceneRange,
    characters: activeScene ? activeScene.characters : [],
    grounded: true,
    provider: 'retrieval-engine',
  };
}

/**
 * Retrieve approved contextual trivia for the current playback scene or general movie.
 */
export async function getTriviaContext({ contentId, currentTime = 0 }) {
  const context = await getSceneContext(contentId, currentTime);
  const { contentTitle, activeScene, allTrivia, formattedTime } = context;

  // Filter trivia relevant to active scene first, or fall back to general trivia
  let relevantTrivia = allTrivia.filter((t) => activeScene && t.sceneId === activeScene.sceneId);
  if (relevantTrivia.length === 0) {
    relevantTrivia = allTrivia;
  }

  if (relevantTrivia.length === 0) {
    return {
      fact: `"${contentTitle}" was produced as a landmark open-format creative project showcasing state-of-the-art open source visual artistry.`,
      category: 'Behind the Scenes',
      scene: activeScene ? activeScene.title : 'General',
      timestamp: formattedTime,
    };
  }

  // Pick the most relevant or random trivia
  const selected = relevantTrivia[Math.floor(Math.random() * relevantTrivia.length)];

  return {
    fact: selected.fact,
    category: selected.category,
    scene: activeScene ? activeScene.title : 'General',
    timestamp: formattedTime,
  };
}
