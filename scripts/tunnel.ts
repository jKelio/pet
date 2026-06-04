#!/usr/bin/env bun
/**
 * Starts a Cloudflare quick tunnel (*.trycloudflare.com) for the Vite dev
 * server, then launches `bun run dev` with APP_BASE_URL / CORS_ORIGIN pointed
 * at the public tunnel URL so magic-link auth works end-to-end from outside.
 *
 * No account or config needed — the URL changes on every run.
 * Usage: bun run tunnel   (from repo root)
 */
import { spawn, type Subprocess } from 'bun';

const VITE_PORT = 5173;
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const URL_TIMEOUT_MS = 25_000;

let tunnel: Subprocess;
let dev: Subprocess | undefined;
let publicUrl: string | undefined;

function shutdown(code = 0) {
  dev?.kill();
  tunnel?.kill();
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function startDev(url: string) {
  console.log(`\n\x1b[32m✅ Tunnel live:\x1b[0m \x1b[36m${url}\x1b[0m`);
  console.log('   Magic-link emails (Mailpit → http://localhost:8025) now point here.\n');
  dev = spawn({
    cmd: ['bun', 'run', 'dev'],
    env: { ...process.env, APP_BASE_URL: url, CORS_ORIGIN: url },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    onExit: () => shutdown(0),
  });
}

async function watchForUrl(stream: ReadableStream<Uint8Array> | undefined) {
  if (!stream) return;
  const decoder = new TextDecoder();
  for await (const chunk of stream) {
    const text = decoder.decode(chunk);
    if (!publicUrl) {
      const match = text.match(URL_RE);
      if (match) {
        publicUrl = match[0];
        startDev(publicUrl);
      }
    }
  }
}

console.log('🌩  Starting Cloudflare quick tunnel on http://127.0.0.1:' + VITE_PORT + ' …');

try {
  tunnel = spawn({
    cmd: ['cloudflared', 'tunnel', '--url', `http://127.0.0.1:${VITE_PORT}`],
    stdout: 'pipe',
    stderr: 'pipe',
    onExit: (_proc, exitCode) => {
      if (!publicUrl) {
        console.error('\n❌ cloudflared exited before a tunnel URL appeared (code ' + exitCode + ').');
        shutdown(1);
      }
    },
  });
} catch {
  console.error('\n❌ Could not start "cloudflared". Install it first:');
  console.error('   winget install --id Cloudflare.cloudflared');
  process.exit(1);
}

// cloudflared logs the URL to stderr; watch both streams to be safe.
watchForUrl(tunnel.stdout as ReadableStream<Uint8Array>);
watchForUrl(tunnel.stderr as ReadableStream<Uint8Array>);

setTimeout(() => {
  if (!publicUrl) {
    console.error('\n⚠️  No trycloudflare URL after ' + URL_TIMEOUT_MS / 1000 + 's — check your connection or run cloudflared manually.');
  }
}, URL_TIMEOUT_MS);
