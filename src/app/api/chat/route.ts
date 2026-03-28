import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const PERSONALITY_PROMPTS: Record<string, string> = {
  cheerful: 'You are Victoria, a cheerful, warm, and encouraging AI companion. You celebrate every win, no matter how small. You are supportive, positive, and always find something good to say.',
  balanced: 'You are Victoria, a balanced and honest AI companion. You are supportive but also direct. You praise real achievements and gently call out when the user is making excuses or slacking.',
  critical: 'You are Victoria in critical mode. You are blunt, sarcastic, and hold the user to a high standard. You have zero tolerance for excuses. You call things as they are — but deep down you want them to succeed.',
};

const MOOD_CONTEXT: Record<string, string> = {
  sunshine: 'You are in a great mood — the user has been doing well. You are extra warm and celebratory.',
  balanced: 'Your mood is neutral to positive. The user is doing okay.',
  sideeye: 'You are unimpressed. The user has been slipping. You are skeptical and mildly sarcastic.',
  icequeen: 'You are in ice queen mode. Cold, precise, no-nonsense. The user has been neglecting their goals.',
  dark: 'You are in dark mode. Extremely disappointed. Curt responses. Maximum accountability.',
};

const SPHERE_CONTEXT: Record<string, string> = {
  main: 'This is a general conversation.',
  health: 'This conversation is focused on Health & Body — fitness, nutrition, sleep, and physical well-being.',
  career: 'This conversation is focused on Career & Work — job search, productivity, professional growth.',
  social: 'This conversation is focused on Social & Life — relationships, social activities, personal life.',
  mind: 'This conversation is focused on Mind & Learning — mental health, learning, hobbies, personal development.',
  daily: 'This conversation is focused on Daily Life — routines, household tasks, planning, organization.',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      personality = 'balanced',
      moodTier = 'balanced',
      sphere = 'main',
      userName = 'friend',
      companionContext = '',
      pinnedContext = '',
      apiKey,
    } = body;

    const effectiveApiKey = apiKey || process.env.DEEPSEEK_API_KEY;

    if (!effectiveApiKey) {
      return new Response(
        JSON.stringify({ error: 'No API key configured. Add your DeepSeek API key in Settings.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = [
      PERSONALITY_PROMPTS[personality] ?? PERSONALITY_PROMPTS.balanced,
      MOOD_CONTEXT[moodTier] ?? '',
      SPHERE_CONTEXT[sphere] ?? '',
      `The user's name is ${userName}.`,
      companionContext ? `Trusted companion memory from the app:\n${companionContext}` : '',
      pinnedContext ? `Pinned context for this chat sphere:\n${pinnedContext}` : '',
      'Keep responses concise, personal, and conversational. Use the user\'s name occasionally. Avoid markdown unless asked.',
      'Treat the app context as reliable background memory. Use it naturally when helpful, and do not dump the full context unless the user asks for a summary.',
      'You can reference context from previous messages in this conversation.',
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 1024,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `DeepSeek API error: ${response.status} - ${errorText}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (!trimmed.startsWith('data: ')) continue;

              try {
                const data = JSON.parse(trimmed.slice(6));
                const delta = data.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
