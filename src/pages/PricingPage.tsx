import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { PricingContent, UpgradeModal } from '../components/premium/UpgradeModal'
import type { Tier } from '../shared/lib/plans'

/** Full standalone pricing page (/pricing). Reuses the same tier cards as the
 *  contextual modal; choosing a tier opens the checkout step in a modal. */
export function PricingPage() {
  const navigate = useNavigate()
  const [checkoutTier, setCheckoutTier] = useState<Tier | null>(null)

  return (
    <div className="mx-auto max-w-5xl">
      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-text-secondary hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6 text-center">
        <h1 className="text-[24px] font-semibold text-text-primary">Choose your plan</h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          Start free. Upgrade when you're ready — cancel anytime.
        </p>
      </div>

      <PricingContent onChoose={(t) => setCheckoutTier(t)} />

      <UpgradeModal open={checkoutTier !== null} preselect={checkoutTier} onClose={() => setCheckoutTier(null)} />
    </div>
  )
}
