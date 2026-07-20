'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          console.log('[SW] Service Worker successfully registered at root scope:', reg.scope)
        } catch (err) {
          console.error('[SW] Service Worker registration failed:', err)
        }
      }

      if (document.readyState === 'complete') {
        registerSW()
      } else {
        window.addEventListener('load', registerSW, { once: true })
      }
    }
  }, [])

  return null
}
