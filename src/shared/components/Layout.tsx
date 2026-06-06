import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { NavBar } from './NavBar'

export function Layout() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <NavBar />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          },
        }}
      />
    </div>
  )
}
