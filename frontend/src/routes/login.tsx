import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '#domain/core/auth/ui/LoginPage'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})
