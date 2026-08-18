import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './lib/theme.tsx'
import { NavOrderProvider } from './lib/navOrder.tsx'
import { ToastProvider } from './lib/toast.tsx'
import { ConfirmProvider } from './lib/confirm.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <NavOrderProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter basename="/test">
              <App />
            </BrowserRouter>
          </ConfirmProvider>
        </ToastProvider>
      </NavOrderProvider>
    </ThemeProvider>
  </StrictMode>,
)
