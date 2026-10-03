import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {/*
        One boundary for the whole app, rather than one per route.

        The gameplay routes are split chunks, so arriving at them suspends. A
        boundary created in the same commit as the thing that suspends has no
        previous children to keep, so React has to draw its fallback - which
        emptied the screen for a moment between the last lesson frame and the
        game. This one is already mounted when that happens, so a transition
        can hold the frame already on screen until the game can draw.
      */}
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </AuthProvider>
  </StrictMode>,
)
