import { useState } from 'react'

/**
 * Drives a one-shot shake animation (e.g. on an invalid form submit).
 * Spread `shakeProps` onto the element and add the `shake` class while
 * `shaking` is true; call `triggerShake()` to play it. The animation clears
 * itself on animationend so it can replay on the next invalid submit.
 */
export function useShake() {
  const [shaking, setShaking] = useState(false)
  return {
    shaking,
    // Reset then re-set on the next frame so the animation replays even when a
    // second invalid submit arrives while the previous shake is still running.
    triggerShake: () => {
      setShaking(false)
      requestAnimationFrame(() => setShaking(true))
    },
    shakeProps: { onAnimationEnd: () => setShaking(false) },
  }
}
