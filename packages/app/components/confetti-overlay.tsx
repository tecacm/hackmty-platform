'use client'

import React, { useEffect, useRef } from 'react'
import { View, Platform, StyleSheet } from 'react-native'

interface ConfettiOverlayProps {
  active: boolean
  duration?: number // ms
  onComplete?: () => void
}

const BRAND_COLORS = [
  '#5a0061', // HackMTY Deep Purple
  '#c2b75f', // HackMTY Gold
  '#ff4081', // Pink
  '#00e676', // Emerald Green
  '#00b0ff', // Cyan
  '#ffea00', // Bright Yellow
  '#ff9100', // Vibrant Orange
  '#a855f7', // Purple
  '#ec4899', // Hot Pink
  '#3b82f6', // Electric Blue
]

export function ConfettiOverlay({ active, duration = 5500, onComplete }: ConfettiOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active) return
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      const timer = setTimeout(() => onComplete?.(), duration)
      return () => clearTimeout(timer)
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const width = window.innerWidth
    const height = window.innerHeight

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const particleCount = 320
    const particles: Array<{
      x: number
      y: number
      w: number
      h: number
      color: string
      vx: number
      vy: number
      rotation: number
      vRot: number
      swayFrequency: number
      swayAmplitude: number
      shape: 'rect' | 'circle' | 'strip'
      opacity: number
    }> = []

    for (let i = 0; i < particleCount; i++) {
      // 45% left cannon, 45% right cannon, 10% top rain
      const rand = Math.random()
      let startX: number
      let startY: number
      let initialVx: number
      let initialVy: number

      if (rand < 0.45) {
        // Left cannon (bottom-left burst)
        startX = Math.random() * (width * 0.15)
        startY = height * 0.85 + Math.random() * (height * 0.15)
        initialVx = Math.random() * 22 + 8
        initialVy = Math.random() * -24 - 12
      } else if (rand < 0.90) {
        // Right cannon (bottom-right burst)
        startX = width - Math.random() * (width * 0.15)
        startY = height * 0.85 + Math.random() * (height * 0.15)
        initialVx = (Math.random() * 22 + 8) * -1
        initialVy = Math.random() * -24 - 12
      } else {
        // Top rain (spread across top half)
        startX = Math.random() * width
        startY = Math.random() * (height * 0.4) - 80
        initialVx = (Math.random() - 0.5) * 12
        initialVy = Math.random() * -8 - 2
      }

      particles.push({
        x: startX,
        y: startY,
        w: Math.random() * 14 + 6,
        h: Math.random() * 10 + 5,
        color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)] || '#5a0061',
        vx: initialVx,
        vy: initialVy,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 16,
        swayFrequency: Math.random() * 0.08 + 0.02,
        swayAmplitude: Math.random() * 2.5 + 0.5,
        shape: rand > 0.7 ? 'circle' : rand > 0.3 ? 'strip' : 'rect',
        opacity: 1,
      })
    }

    let animationFrameId: number
    const startTime = Date.now()
    const gravity = 0.36
    const drag = 0.982

    const render = () => {
      const elapsed = Date.now() - startTime
      ctx.clearRect(0, 0, width, height)

      let stillAlive = false
      particles.forEach((p) => {
        p.vx *= drag
        p.vy += gravity
        // Add subtle horizontal fluttering sway
        const sway = Math.sin(p.rotation * p.swayFrequency) * p.swayAmplitude
        p.x += p.vx + sway
        p.y += p.vy
        p.rotation += p.vRot

        // Smooth fade out towards the end
        if (elapsed > duration - 1600) {
          p.opacity = Math.max(0, (duration - elapsed) / 1600)
        }

        if (p.y < height + 80 && p.opacity > 0) {
          stillAlive = true
          ctx.save()
          ctx.globalAlpha = p.opacity
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)

          ctx.fillStyle = p.color
          if (p.shape === 'circle') {
            ctx.beginPath()
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
            ctx.fill()
          } else if (p.shape === 'strip') {
            ctx.fillRect(-p.w / 2, -p.h / 4, p.w * 1.5, p.h / 2)
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          }
          ctx.restore()
        }
      })

      if (elapsed < duration && stillAlive) {
        animationFrameId = requestAnimationFrame(render)
      } else {
        ctx.clearRect(0, 0, width, height)
        onComplete?.()
      }
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (ctx) ctx.clearRect(0, 0, width, height)
    }
  }, [active, duration, onComplete])

  if (!active) return null

  if (Platform.OS === 'web') {
    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 999999,
        }}
      />
    )
  }

  return <View style={StyleSheet.absoluteFillObject} pointerEvents="none" />
}