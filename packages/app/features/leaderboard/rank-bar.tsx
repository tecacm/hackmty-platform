import React from 'react'
// @ts-ignore - @types/react-dom isn't installed in this workspace; react-dom is present at runtime (Next).
import { createPortal } from 'react-dom'

/**
 * Web: portals the rank bar to document.body so `position: fixed` anchors to the window
 * (not to the parallax shell's transformed ancestor, which would make it scroll away).
 */
export function RankBar({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 18,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>,
    document.body
  )
}
