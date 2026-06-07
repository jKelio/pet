import type { RecommendationDocument, PracticeSession } from '@pet/shared';

export interface GenerateRecommendationInput {
  session: PracticeSession;
  sourceUrls: string[];
  language: string;
}

export interface AiRecommendationGenerator {
  generate(input: GenerateRecommendationInput): AsyncIterable<AiProgressEvent>;
}

export type AiProgressStatus = 'fetching' | 'generating' | 'done';

export interface AiProgressEvent {
  status: AiProgressStatus;
  document?: RecommendationDocument;
}
