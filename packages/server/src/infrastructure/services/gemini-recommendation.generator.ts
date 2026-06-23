import type { AiRecommendationGenerator, AiProgressEvent, GenerateRecommendationInput } from '../../domain/ports/ai-recommendation.generator.js';
import type { RecommendationDocument, PracticeSession, Drill } from '@pet/shared';

export class RecommendationGenerationError extends Error {
  readonly statusCode = 502;
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationGenerationError';
  }
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Gemini occasionally translates JSON field names into the requested language.
// This normalizer resolves known translations back to the canonical English keys.
export function normalizeRecommendationDocument(raw: Record<string, unknown>): RecommendationDocument {
  const pick = (...keys: string[]) => keys.find((k) => raw[k] !== undefined);
  const str = (...keys: string[]) => { const k = pick(...keys); return typeof raw[k!] === 'string' ? raw[k!] as string : ''; };
  const arr = (...keys: string[]) => { const k = pick(...keys); return Array.isArray(raw[k!]) ? raw[k!] as string[] : []; };
  return {
    summary: str('summary', 'zusammenfassung', 'резюме', 'résumé', 'resumen'),
    strengths: arr('strengths', 'staerken', 'stärken', 'сильные_стороны', 'fortalezas'),
    concerns: arr('concerns', 'bedenken', 'опасения', 'préoccupations', 'preocupaciones'),
    recommendations: arr('recommendations', 'empfehlungen', 'рекомендации', 'recommandations', 'recomendaciones'),
  };
}


function formatSessionSummary(session: PracticeSession): string {
  const info = session.practiceInfo;
  const totalMinutes = Math.round(info.totalTime / 60000);
  const wasteMinutes = Math.round((info.wasteTime?.totalTime ?? 0) / 60000);
  const wastePercent = totalMinutes > 0 ? Math.round((wasteMinutes / totalMinutes) * 100) : 0;

  const drillSummaries = session.drills.map((drill: Drill, idx: number) => {
    const timerLines = Object.entries(drill.timerData).map(([action, data]) =>
      `    - ${action}: ${Math.round(data.totalTime / 1000)}s`,
    );
    const counterLines = Object.entries(drill.counterData).map(([action, data]) =>
      `    - ${action}: ${data.count} times`,
    );
    const drillWaste = Math.round((drill.wasteTime?.totalTime ?? 0) / 1000);
    const tags = drill.tags.length > 0 ? ` [${drill.tags.join(', ')}]` : '';
    return [
      `  Drill ${idx + 1}${tags}:`,
      ...timerLines,
      ...counterLines,
      `    - waste time: ${drillWaste}s`,
    ].join('\n');
  });

  return [
    `Session Date: ${info.date.split('T')[0]}`,
    `Coach: ${info.coachName}`,
    `Tracked Player: ${info.trackedPlayerName}`,
    `Team: ${info.teamName}`,
    `Total Duration: ${totalMinutes} min`,
    `Gap Time (between drills): ${wasteMinutes} min (${wastePercent}% of total)`,
    `Number of Drills: ${session.drills.length}`,
    `Athletes: ${info.athletesNumber}, Coaches: ${info.coachesNumber}`,
    '',
    'Drill Details:',
    ...drillSummaries,
  ].join('\n');
}

const LANGUAGE_NAMES: Record<string, string> = {
  de: 'German (Deutsch)',
  ru: 'Russian (Русский)',
  en: 'English',
};

export class GeminiRecommendationGenerator implements AiRecommendationGenerator {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async *generate(input: GenerateRecommendationInput): AsyncIterable<AiProgressEvent> {
    yield { status: 'fetching' };

    const sessionSummary = formatSessionSummary(input.session);

    const languageName = LANGUAGE_NAMES[input.language] ?? 'English';
    const prompt = [
      `You are an expert ice hockey development coach. Analyze the following practice session tracking data`,
      `in the context of the curated reference knowledge to produce a structured coaching recommendation report.`,
      ``,
      `IMPORTANT: Write ALL string VALUES exclusively in ${languageName}. Do not use any other language for the values.`,
      `The JSON field NAMES (summary, strengths, concerns, recommendations) MUST always remain in English exactly as shown.`,
      ``,
      `## Tracked Session Data`,
      sessionSummary,
      ``,
      `## Reference Knowledge`,
      input.knowledgeText || '(no reference knowledge available)',
      ``,
      `Analyze the session data in the context of the reference knowledge.`,
      `Be specific, data-driven, and practical. Reference concrete numbers from the session.`,
      ``,
      `Respond with a single JSON object matching this schema exactly (no markdown, no code fences):`,
      `{`,
      `  "summary": "<string>",`,
      `  "strengths": ["<string>", ...],`,
      `  "concerns": ["<string>", ...],`,
      `  "recommendations": ["<string>", ...]`,
      `}`,
    ].join('\n');

    yield { status: 'generating' };

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            summary: { type: 'STRING' },
            strengths: { type: 'ARRAY', items: { type: 'STRING' } },
            concerns: { type: 'ARRAY', items: { type: 'STRING' } },
            recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['summary', 'strengths', 'concerns', 'recommendations'],
        },
      },
    };

    const res = await fetch(
      `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    if (!res.ok) {
      if (res.status === 429) {
        const body = await res.json().catch(() => null) as any;
        const retryDelay = body?.error?.details?.find((d: any) => d.retryDelay)?.retryDelay ?? '60s';
        throw new RecommendationGenerationError(`Rate limit exceeded. Please retry in ${retryDelay}.`);
      }
      if (res.status === 503) {
        const body = await res.json().catch(() => null) as any;
        const msg = body?.error?.message ?? 'The AI service is temporarily unavailable. Please try again later.';
        throw new RecommendationGenerationError(msg);
      }
      const text = await res.text();
      throw new RecommendationGenerationError(`Gemini API error ${res.status}: ${text}`);
    }

    const data = await res.json() as any;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new RecommendationGenerationError('Gemini returned no content');
    }

    let document: RecommendationDocument;
    try {
      const json = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(json);
      document = normalizeRecommendationDocument(parsed);
    } catch {
      throw new RecommendationGenerationError('Gemini returned invalid JSON');
    }

    yield { status: 'done', document };
  }
}
