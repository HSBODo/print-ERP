import { createFileRoute } from '@tanstack/react-router'
import { EoeisCheckupStatsPage } from '@/pages/exam/EoeisCheckupStatsPage'

export const Route = createFileRoute('/_auth/stats/(exam)/eoeis-checkup')({
  component: EoeisCheckupStatsPage,
  staticData: {
    page: {
      id: 'eoeis-checkup',
      label: '아이리더 검사통계',
      section: '검사',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
