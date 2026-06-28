/**
 * Inline field error — 12px danger text that fades in (see `.field-error` in
 * index.css). Renders nothing when there is no message.
 */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="field-error" role="alert">
      {message}
    </p>
  )
}

/** Red asterisk for required-field labels. */
export function RequiredMark() {
  return (
    <span aria-hidden style={{ color: 'var(--color-danger)' }}>
      {' '}*
    </span>
  )
}
