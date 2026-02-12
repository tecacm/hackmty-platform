import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient'

export interface LinearGradientProps {
  colors: string[]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
  locations?: number[]
  style?: any
  children?: React.ReactNode
}

export function LinearGradient(props: LinearGradientProps) {
  return <ExpoLinearGradient {...props} />
}
