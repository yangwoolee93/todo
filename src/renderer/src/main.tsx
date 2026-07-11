import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/index.css'

const platform = window.electron?.platform ?? 'unknown'
document.documentElement.classList.add(`platform-${platform}`)

/** React Renderer 엔트리 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
