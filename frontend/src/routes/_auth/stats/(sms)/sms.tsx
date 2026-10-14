import { createFileRoute } from '@tanstack/react-router'

import { SmsManagementPage } from '#domain/core/sms/ui/SmsManagementPage'

export const Route = createFileRoute('/_auth/stats/(sms)/sms')({
  component: SmsManagementPage,
  staticData: {
    page: {
      id: 'sms',
      label: '문자 발송 리스트',
      section: '마케팅',
      status: 'complete',
      access: { department: 'MARKETING' },
    },
  },
})
