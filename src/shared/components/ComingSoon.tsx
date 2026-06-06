import { Construction } from 'lucide-react'

interface Props {
  title: string
  description?: string
}

export function ComingSoon({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
      <div className="h-14 w-14 rounded-2xl bg-bg-card border border-border flex items-center justify-center">
        <Construction className="h-6 w-6 text-text-secondary" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-text-primary mb-1">{title}</h1>
        <p className="text-text-secondary text-sm">
          {description ?? 'This section is under construction.'}
        </p>
      </div>
    </div>
  )
}
