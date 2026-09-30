import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'

import { Toaster } from '#shared/ui/Sonner'

import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// 라우트는 src/routes 파일 구조로 정의하고, routeTree.gen.ts 는 @tanstack/router-plugin 이 생성한다.
// export 하지 않는다 (컴포넌트 외 export 는 fast refresh 규칙 위반) — 컴포넌트에서는 useRouter() 로 접근.
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  )
}

export default App
