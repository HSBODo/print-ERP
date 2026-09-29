import { useState } from 'react'
import { X } from 'lucide-react'

interface ErrorOverlayProps {
  show: boolean
  children: React.ReactNode
}

export function ErrorOverlay({ show, children }: ErrorOverlayProps) {
  const [dismissed, setDismissed] = useState(false)

  const visible = show && !dismissed

  return (
    <div className="relative">
      {children}
      {visible && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-gray-900/40 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="rounded-md bg-white/90 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm">
            데이터 로드 실패
          </span>
        </div>
      )}
    </div>
  )
}
