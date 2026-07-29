import React from 'react'
import { View } from 'react-native'

interface GlassViewCardProps {
  children: React.ReactNode
  style?: any
  glassEffect?: 'clear' | 'regular' | 'prominent'
}

export function GlassViewCard({ children, style }: GlassViewCardProps) {
  return <View style={style}>{children}</View>
}
