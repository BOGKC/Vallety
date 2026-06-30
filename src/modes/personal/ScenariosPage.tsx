import { useNavigate } from 'react-router-dom'
import { GitBranch, ArrowRight } from 'lucide-react'
import { EmptyState } from '../../components/EmptyState'

export function ScenariosPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 text-[18px] font-semibold text-text-primary">Scenarios</h1>
      <EmptyState
        icon={GitBranch}
        title="No scenarios yet"
        description="Add your net worth accounts first, then create scenarios to see how big decisions affect your future."
        primaryAction={{ label: 'Add accounts first', icon: ArrowRight, onClick: () => navigate('/net-worth') }}
      />
    </div>
  )
}
