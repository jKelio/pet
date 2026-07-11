/**
 * Tap Feedback for the live-tracking surface: a short haptic tick confirming
 * an *effective* action (a timer switched, a counter counted, a drill
 * started/ended). Taps swallowed by the counter debounce must not call this —
 * the feedback must never suggest more effect than actually happened.
 *
 * iOS has no Vibration API, so vibration is best-effort; the visual pulse
 * (`animate-tap-pulse`) is the cross-platform half of the feedback.
 */
export function hapticTick(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(25);
  }
}
