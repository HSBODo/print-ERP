interface StatsStackProps {
  children: React.ReactNode
}

export function StatsStack({ children }: StatsStackProps) {
  return (
    <div className="space-y-4">
      {children}
    </div>
  )
}
