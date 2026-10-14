import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { initApiClient } from '#domain/support/session/initApiClient'

import App from './App'

initApiClient()

// 폐기한 "아이디·비밀번호 저장" 기능이 평문으로 남긴 자격증명을 기존 사용자 브라우저에서 지운다.
localStorage.removeItem('remembered-login')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
