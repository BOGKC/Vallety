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
    triggerShake: () => setShaking(true),
    shakeProps: { onAnimationEnd: () => setShaking(false) },
  }
}
