import { createRouter } from '@tanstack/react-router'

import { routeTree } from '@/routeTree.gen'

/** 테스트 전용 — 라우트 메타·메뉴 정합 테스트가 같은 라우터를 읽는다. */
export const testRouter = createRouter({ routeTree })

type RouteByPath =
  (typeof testRouter.routesByPath)[keyof typeof testRouter.routesByPath]

// routesByPath 는 인덱스 시그니처가 없는 interface 라 Object.values 가 any[] 로 떨어진다 → 값 타입을 되찾아 준다.
export const testRoutes = Object.values(
  testRouter.routesByPath,
) as RouteByPath[]
