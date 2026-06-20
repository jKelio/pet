/**
 * Triggers Render.com's free-tier cold-start wake for the backend.
 *
 * A spun-down free instance is only booted by a *navigation* to it. Render's
 * edge rate-limits programmatic `fetch`/XHR probes (returning a "rate-limited"
 * response) without ever waking the container — proven against the live
 * service. An iframe load *is* a navigation, so pointing a hidden iframe at the
 * backend health URL reaches Render's edge and starts the boot.
 *
 * The iframe is never visible: the backend's `X-Frame-Options: DENY` (and
 * Render's interstitial) block it from rendering, but the request still fires
 * and that is all the wake needs. Readiness is detected separately by the
 * same-origin `/api/health` poll, which succeeds once the instance is up.
 */

/**
 * Mounts the hidden wake-up iframe. Returns a cleanup function that removes it.
 * Safe to call in non-DOM environments (returns a no-op).
 */
export function mountServerWakeFrame(url: string): () => void {
  if (typeof document === 'undefined') return () => {};

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.title = 'server wake-up';
  // Off-screen and inert — it exists only to issue the wake navigation.
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.src = url;

  document.body.appendChild(iframe);

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    iframe.remove();
  };
}
