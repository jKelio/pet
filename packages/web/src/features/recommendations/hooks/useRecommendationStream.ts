import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Recommendation } from '@pet/shared';
import { streamRecommendation } from '../api/recommendation.api.js';

type StreamStatus = 'idle' | 'fetching' | 'generating' | 'ready' | 'error';

interface UseRecommendationStreamResult {
  status: StreamStatus;
  recommendation: Recommendation | null;
  error: string | null;
  generate: (sessionId: string, accessToken: string) => Promise<void>;
}

export function useRecommendationStream(): UseRecommendationStreamResult {
  const { i18n } = useTranslation();
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (sessionId: string, accessToken: string) => {
    setStatus('fetching');
    setError(null);

    const language = i18n.language.split('-')[0];

    try {
      for await (const { event, data } of streamRecommendation(sessionId, language, accessToken)) {
        if (event === 'progress') {
          const progress = data as { status: string };
          if (progress.status === 'fetching') setStatus('fetching');
          else if (progress.status === 'generating') setStatus('generating');
        } else if (event === 'result') {
          setRecommendation(data as Recommendation);
          setStatus('ready');
        } else if (event === 'error') {
          const err = data as { message: string };
          setError(err.message ?? 'An error occurred');
          setStatus('error');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      setStatus('error');
    }
  }, [i18n]);

  return { status, recommendation, error, generate };
}
