import type { FastifyInstance } from 'fastify';
import type { UserRepository } from '../../domain/ports/user.repository.js';

const REPO = 'jKelio/pet';
const GH_API = 'https://api.github.com';

type FeedbackType = 'bug' | 'feature' | 'general';

const TYPE_META: Record<FeedbackType, { prefix: string; label: string }> = {
  bug: { prefix: '[Bug]', label: 'bug' },
  feature: { prefix: '[Feature]', label: 'enhancement' },
  general: { prefix: '[Feedback]', label: 'feedback' },
};

const TITLE_MAX = 60;
const MAX_SCREENSHOTS = 3;

function buildTitle(type: FeedbackType, text: string): string {
  const { prefix } = TYPE_META[type];
  const summary = text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX)}…` : text;
  return `${prefix} ${summary}`;
}

async function uploadScreenshot(buffer: Buffer, mimeType: string, pat: string): Promise<string> {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
  const slug = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `feedback-screenshots/${slug}`;

  const res = await fetch(`${GH_API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      message: `chore: add feedback screenshot ${slug}`,
      content: buffer.toString('base64'),
    }),
  });

  const resBody = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(`GitHub content upload failed: ${res.status} — ${JSON.stringify(resBody)}`);

  const downloadUrl = (resBody as { content?: { download_url?: string } }).content?.download_url;
  if (!downloadUrl) throw new Error(`GitHub content upload: no download_url in response`);
  return downloadUrl;
}

interface FeedbackRoutesDeps {
  githubPat: string | undefined;
  userRepository: UserRepository;
}

export function registerFeedbackRoutes(fastify: FastifyInstance, deps: FeedbackRoutesDeps): void {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/app-feedback', async (request, reply) => {
    if (!deps.githubPat) {
      return reply.code(503).send({
        code: 'FEEDBACK_UNAVAILABLE',
        message: 'Feedback submission is not configured on this server.',
        statusCode: 503,
      });
    }

    const parts = request.parts({ limits: { fileSize: 5 * 1024 * 1024 } });

    let type: FeedbackType = 'general';
    let text = '';
    const screenshotUrls: string[] = [];

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'type' && ['bug', 'feature', 'general'].includes(part.value as string)) {
          type = part.value as FeedbackType;
        } else if (part.fieldname === 'text') {
          text = (part.value as string).trim();
        }
      } else if (part.type === 'file' && part.fieldname === 'screenshot') {
        if (part.mimetype.startsWith('image/') && screenshotUrls.length < MAX_SCREENSHOTS) {
          const buffer = await part.toBuffer();
          if (buffer.length > 0) {
            try {
              screenshotUrls.push(await uploadScreenshot(buffer, part.mimetype, deps.githubPat));
            } catch (err) {
              fastify.log.warn({ err }, 'Screenshot upload to GitHub failed, submitting without it');
            }
          }
        } else {
          await part.toBuffer(); // drain to avoid hanging (wrong mimetype, or cap already reached)
        }
      }
    }

    if (!text) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR', message: 'text is required', statusCode: 400 });
    }

    const user = await deps.userRepository.findById(request.userId);
    const displayName = user?.name || user?.email || request.userEmail;
    const { label } = TYPE_META[type];

    const bodyLines = [`**From:** ${displayName}`, '', text];
    for (const url of screenshotUrls) bodyLines.push('', `![screenshot](${url})`);

    const ghRes = await fetch(`${GH_API}/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.githubPat}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: buildTitle(type, text),
        body: bodyLines.join('\n'),
        labels: [label],
      }),
    });

    if (!ghRes.ok) {
      fastify.log.error({ status: ghRes.status }, 'GitHub issue creation failed');
      return reply.code(502).send({
        code: 'GITHUB_ERROR',
        message: 'Failed to create feedback issue. Please try again.',
        statusCode: 502,
      });
    }

    return reply.code(201).send();
  });
}
