/**
 * Boot-time fallback shown by main.tsx when the app fails to start before
 * React mounts (e.g. a missing Supabase env var thrown during module
 * evaluation, which the in-app ErrorBoundary can't catch). Turns an
 * otherwise-blank screen into a legible message.
 */
export function BootError({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 24,
        textAlign: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-accent)' }}>V</span>
      <h1 style={{ margin: '16px 0 0', fontSize: 18, fontWeight: 600 }}>Vallety couldn’t start</h1>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 460 }}>{message}</p>
    </div>
  )
}
