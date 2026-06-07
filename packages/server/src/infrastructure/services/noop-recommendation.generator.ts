import type { AiRecommendationGenerator, AiProgressEvent } from '../../domain/ports/ai-recommendation.generator.js';

export class NoOpRecommendationGenerator implements AiRecommendationGenerator {
  async *generate(): AsyncIterable<AiProgressEvent> {
    throw new Error('AI recommendations are not configured. Set GEMINI_API_KEY to enable this feature.');
  }
}
