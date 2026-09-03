import React from 'react'
import { View, StyleSheet } from 'react-native'

/** Native: absolute-bottom bar (no portal / react-dom on native). */
export function RankBar({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bar} pointerEvents="box-none">
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: 'center',
  },
})
