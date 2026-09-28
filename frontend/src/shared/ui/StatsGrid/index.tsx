interface StatsGridProps {
  children: React.ReactNode
}

export function StatsGrid({ children }: StatsGridProps) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  )
}
