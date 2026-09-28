import { createFileRoute } from '@tanstack/react-router'
import { SmsManagementPage } from '@/pages/sms/SmsManagementPage'

export const Route = createFileRoute('/_auth/stats/(sms)/sms')({
  component: SmsManagementPage,
})
