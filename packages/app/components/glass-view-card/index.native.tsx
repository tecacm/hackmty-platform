import React from 'react'
import { Platform, View } from 'react-native'
import { GlassView } from 'expo-glass-effect'

interface GlassViewCardProps {
  children: React.ReactNode
  style?: any
  glassEffect?: 'clear' | 'regular' | 'prominent'
}

export function GlassViewCard({ children, style, glassEffect = 'clear' }: GlassViewCardProps) {
  if (Platform.OS === 'ios') {
    return (
      <GlassView glassEffect={glassEffect as any} style={style}>
        {children}
      </GlassView>
    )
  }

  return <View style={style}>{children}</View>
}
