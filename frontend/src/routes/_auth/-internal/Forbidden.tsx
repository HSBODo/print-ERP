import { Link } from '@tanstack/react-router'

export function Forbidden() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-lg font-semibold text-gray-900">접근 권한이 없습니다.</p>
      <Link to="/" className="text-sm text-blue-600 hover:underline">
        홈으로 이동
      </Link>
    </div>
  )
}
