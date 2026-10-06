import { createFileRoute } from '@tanstack/react-router'

import { EventNotePage } from '#domain/core/eventNote/ui/EventNotePage'

export const Route = createFileRoute('/_auth/stats/(marketing)/event-notes')({
  component: EventNotePage,
  staticData: {
    page: {
      id: 'event-notes',
      label: '이벤트 노트',
      section: '마케팅',
      status: 'complete',
      access: { department: 'MARKETING' },
    },
  },
})
