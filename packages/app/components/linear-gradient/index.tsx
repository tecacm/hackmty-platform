import React from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'

export interface LinearGradientProps {
  colors: string[]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  locations?: number[]
  style?: ViewStyle
  children?: React.ReactNode
}

export function LinearGradient({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  locations,
  style,
  children,
}: LinearGradientProps) {
  // Calculate angle from start/end points
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90

  // Build gradient string
  let gradientStops = colors.map((color, index) => {
    if (locations && locations[index] !== undefined) {
      return `${color} ${locations[index] * 100}%`
    }
    return color
  }).join(', ')

  const backgroundImage = `linear-gradient(${angle}deg, ${gradientStops})`

  return (
    <View
      style={[
        style,
        {
          // @ts-ignore - backgroundImage is valid in React Native Web
          backgroundImage,
        },
      ]}
    >
      {children}
    </View>
  )
}
