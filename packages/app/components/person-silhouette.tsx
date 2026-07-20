import React from 'react'
import { View, StyleSheet } from 'react-native'

interface PersonSilhouetteProps {
  size?: number
  color?: string
}

export function PersonSilhouette({ size = 38, color = '#a3a3a3' }: PersonSilhouetteProps) {
  const headSize = Math.round(size * 0.32)
  const headRadius = Math.round(headSize / 2)
  const headMarginTop = Math.round(-size * 0.14)

  const shoulderSize = Math.round(size * 0.64)
  const shoulderRadius = Math.round(shoulderSize / 2)
  const shoulderBottom = Math.round(-size * 0.29)

  return (
    <View style={styles.container}>
      <View
        style={{
          width: headSize,
          height: headSize,
          borderRadius: headRadius,
          backgroundColor: color,
          marginTop: headMarginTop,
        }}
      />
      <View
        style={{
          width: shoulderSize,
          height: shoulderSize,
          borderRadius: shoulderRadius,
          backgroundColor: color,
          position: 'absolute',
          bottom: shoulderBottom,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
})
