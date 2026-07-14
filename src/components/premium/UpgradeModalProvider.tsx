/* eslint-disable react-refresh/only-export-components -- context + hook + provider co-located by design */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { UpgradeModal } from './UpgradeModal'
import type { Tier } from '../../shared/lib/plans'

interface UpgradeCtx {
  /** Open the contextual upgrade modal, optionally pre-selecting a tier. */
  open: (tier?: Tier) => void
}

const Ctx = createContext<UpgradeCtx | null>(null)

/** Access the app-wide upgrade modal from any gate/button. */
export function useUpgrade(): UpgradeCtx {
  const c = useContext(Ctx)
  if (!c) return { open: () => {} } // safe no-op outside the provider (e.g. tests)
  return c
}

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [openTier, setOpenTier] = useState<Tier | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((tier?: Tier) => {
    setOpenTier(tier ?? null)
    setIsOpen(true)
  }, [])

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <UpgradeModal open={isOpen} preselect={openTier} onClose={() => setIsOpen(false)} />
    </Ctx.Provider>
  )
}
