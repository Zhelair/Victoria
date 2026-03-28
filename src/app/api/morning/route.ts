import { NextRequest } from 'next/server';
import { fetchMorningLiveData, type MorningHistoryEvent, type MorningWeather } from '@/lib/morning-live';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

function formatWeather(weather: MorningWeather | null) {
  if (!weather) return 'No live weather data available.';

  const tempRange =
    weather.minTemperatureC !== undefined && weather.maxTemperatureC !== undefined
      ? ` High ${weather.maxTemperatureC}C, low ${weather.minTemperatureC}C.`
      : '';
  const feelsLike =
    weather.apparentTemperatureC !== undefined
      ? ` Feels like ${weather.apparentTemperatureC}C.`
      : '';
  const rain =
    weather.precipitationChance !== undefined
      ? ` Rain chance ${weather.precipitationChance}%.`
      : '';
  const wind =
    weather.windSpeedKph !== undefined ? ` Wind ${weather.windSpeedKph} km/h.` : '';

  return `${weather.location}: ${weather.temperatureC}C and ${weather.description}.${tempRange}${feelsLike}${rain}${wind}`.trim();
}

function formatEvent(event: MorningHistoryEvent | null) {
  if (!event) return 'No live history item available.';
  return `${event.year}: ${event.text}`;
}

function buildFallbackBriefing({
  userName,
  topTodos,
  topGoals,
  planTitle,
  planDay,
  streakDays,
  weather,
  event,
  newsEnabled,
  newsTopics,
}: {
  userName: string;
  topTodos: string[];
  topGoals: string[];
  planTitle?: string | null;
  planDay?: number | null;
  streakDays: number;
  weather: MorningWeather | null;
  event: MorningHistoryEvent | null;
  newsEnabled: boolean;
  newsTopics: string;
}) {
  const opener = `Good morning, ${userName || 'friend'}.`;
  const tasks =
    topTodos.length > 0
      ? `Your first tasks are ${topTodos.slice(0, 2).join(' and ')}.`
      : 'You do not have saved tasks yet, so give yourself one clear win this morning.';
  const goals =
    topGoals.length > 0
      ? `Keep ${topGoals[0]} in focus today.`
      : 'You can use today to set one active goal that matters.';
  const plan =
    planTitle && planDay
      ? `Your active plan is ${planTitle}, day ${planDay}.`
      : 'No active fitness plan is queued for today.';
  const streak =
    streakDays > 0
      ? `Your streak is ${streakDays} day${streakDays === 1 ? '' : 's'}, so protect the momentum.`
      : 'Today can be your clean restart point.';
  const weatherLine = weather
    ? `Weather check: ${formatWeather(weather)}`
    : '';
  const eventLine = event
    ? `On this day: ${formatEvent(event)}`
    : '';
  const newsLine =
    newsEnabled && newsTopics.trim()
      ? `Your news interests are saved as ${newsTopics}, but live news is not connected yet.`
      : '';

  return [opener, tasks, goals, plan, streak, weatherLine, eventLine, newsLine]
    .filter(Boolean)
    .join(' ');
}

export async function POST(req: NextRequest) {
  let fallbackPayload:
    | {
        briefing: string;
        weather: MorningWeather | null;
        event: MorningHistoryEvent | null;
        generatedWithAI: boolean;
      }
    | null = null;

  try {
    const body = await req.json();
    const {
      userName = 'friend',
      personality = 'balanced',
      moodTier = 'balanced',
      location = '',
      weatherEnabled = true,
      newsEnabled = false,
      newsTopics = '',
      factCategories = 'general',
      topTodos = [],
      topGoals = [],
      planTitle = null,
      planDay = null,
      streakDays = 0,
    } = body;
    const safeTopTodos = Array.isArray(topTodos)
      ? topTodos.filter((item): item is string => typeof item === 'string').slice(0, 6)
      : [];
    const safeTopGoals = Array.isArray(topGoals)
      ? topGoals.filter((item): item is string => typeof item === 'string').slice(0, 5)
      : [];

    const liveData = await fetchMorningLiveData({
      location,
      includeWeather: Boolean(weatherEnabled),
    });
    fallbackPayload = {
      briefing: buildFallbackBriefing({
        userName,
        topTodos: safeTopTodos,
        topGoals: safeTopGoals,
        planTitle,
        planDay,
        streakDays,
        weather: liveData.weather,
        event: liveData.event,
        newsEnabled,
        newsTopics,
      }),
      weather: liveData.weather,
      event: liveData.event,
      generatedWithAI: false,
    };

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return Response.json(fallbackPayload);
    }

    const systemPrompt = [
      'You are Victoria, a supportive but honest morning companion.',
      `Personality mode: ${personality}. Mood tier: ${moodTier}.`,
      `The user is ${userName}.`,
      'Write one short morning briefing in plain text. Aim for 4 to 6 sentences total.',
      'Be practical, warm, and grounded. Mention weather if available. Mention one "on this day" item if available.',
      'Use the local app context naturally. Offer one clear first move for today.',
      'If live news is not attached, do not invent headlines or pretend you checked the news.',
      'Avoid markdown, bullet points, and dramatic fluff.',
    ].join('\n');

    const userPrompt = [
      `Local app context: tasks ${safeTopTodos.length > 0 ? safeTopTodos.join(', ') : 'none saved'}; goals ${safeTopGoals.length > 0 ? safeTopGoals.join(', ') : 'none saved'}; active plan ${planTitle && planDay ? `${planTitle} day ${planDay}` : 'none'}; streak ${streakDays}.`,
      `Morning preferences: location ${location || 'not set'}; weather ${weatherEnabled ? 'wanted' : 'off'}; fact categories ${factCategories || 'general'}; news ${newsEnabled ? `wanted for ${newsTopics || 'general topics'}` : 'off'}.`,
      `Live weather: ${formatWeather(liveData.weather)}`,
      `Live history item: ${formatEvent(liveData.event)}`,
    ].join('\n');

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        stream: false,
        temperature: 0.75,
        max_tokens: 260,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API returned ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const briefing = data.choices?.[0]?.message?.content?.trim();
    if (!briefing) {
      throw new Error('Empty morning briefing');
    }

    return Response.json({
      briefing,
      weather: liveData.weather,
      event: liveData.event,
      generatedWithAI: true,
    });
  } catch (error) {
    console.error('Morning API error:', error);

    if (fallbackPayload) {
      return Response.json(fallbackPayload);
    }

    return new Response(
      JSON.stringify({ error: 'Unable to build the morning briefing right now.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
