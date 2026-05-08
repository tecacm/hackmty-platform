import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, TextStyle, ViewStyle, Animated, Pressable } from 'react-native'
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  GestureHandlerRootView,
  HandlerStateChangeEvent,
} from 'react-native-gesture-handler'
import { formFieldColors, formFieldStyles } from '../form-field-styles'
import { GlassView } from 'expo-glass-effect'

type SegmentedOption = {
  label: string
  value: string
}

type StyledSegmentedProps = {
  label: string
  value?: string
  options: SegmentedOption[]
  error?: string
  subtitle?: string
  onValueChange: (value: string) => void
  additionalStyle?: TextStyle | ViewStyle | Array<TextStyle | ViewStyle>
}

export function StyledSegmented({
  label,
  value,
  options,
  error,
  subtitle,
  onValueChange,
  additionalStyle = {},
}: StyledSegmentedProps) {
  const hasSelection = value != null && value !== '' && options.some((option) => option.value === value)

  const selectedIndex = useMemo(() => {
    if (!value) return 0
    const found = options.findIndex((option) => option.value === value)
    return found >= 0 ? found : 0
  }, [options, value])

  const [wrapperWidth, setWrapperWidth] = useState(0)
  const indicatorX = useRef(new Animated.Value(0)).current
  const dragScale = useRef(new Animated.Value(1)).current
  const segmentWidth = wrapperWidth > 0 && options.length > 0 ? wrapperWidth / options.length : 0

  // Ref for gesture callbacks (avoid stale closure), state for render
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const lastNearestIndex = useRef<number | null>(null)
  const lastX = useRef(0)

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

  const scaleUp = () => {
    Animated.timing(dragScale, { toValue: 1.2, duration: 120, useNativeDriver: false }).start()
  }

  const scaleDown = () => {
    Animated.spring(dragScale, {
      toValue: 1,
      useNativeDriver: false,
      damping: 20,
      stiffness: 300,
      mass: 0.5,
    }).start()
  }

  const stopDragging = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    setIsDragging(false)
    lastNearestIndex.current = null
    lastX.current = 0
    scaleDown()
  }

  // onActivated fires when the pan gesture crosses the activation threshold —
  // i.e. the finger has actually moved. This is the correct moment to scale up.
  // onBegan fires on touch-down before any movement, so if the user lifts without
  // panning, the gesture goes BEGAN→FAILED and onEnded never fires, leaving scale stuck.
  const onActivated = (_event: HandlerStateChangeEvent<Record<string, unknown>>) => {
    isDraggingRef.current = true
    setIsDragging(true)
    scaleUp()
  }

  const onPan = (event: PanGestureHandlerGestureEvent) => {
    if (!segmentWidth || wrapperWidth === 0) return

    const x = event.nativeEvent.x
    lastX.current = x

    const left = clamp(x - segmentWidth / 2, 0, Math.max(0, wrapperWidth - segmentWidth))
    indicatorX.setValue(left)

    const nearestIndex = Math.min(options.length - 1, Math.max(0, Math.floor(x / segmentWidth)))
    if (lastNearestIndex.current !== nearestIndex) {
      lastNearestIndex.current = nearestIndex
      const nextValue = options[nearestIndex]?.value
      if (nextValue != null && nextValue !== value) {
        onValueChange(nextValue)
      }
    }
  }

  const onPanEnd = (_event: HandlerStateChangeEvent<Record<string, unknown>>) => {
    if (!segmentWidth || wrapperWidth === 0) {
      stopDragging()
      return
    }

    const x = lastX.current
    const nextIndex = Math.min(options.length - 1, Math.max(0, Math.floor(x / segmentWidth)))
    const nextValue = options[nextIndex]?.value
    const targetLeft = nextIndex * segmentWidth

    Animated.spring(indicatorX, {
      toValue: targetLeft,
      useNativeDriver: false,
      damping: 20,
      stiffness: 260,
      mass: 0.7,
    }).start()

    if (nextValue != null && nextValue !== value) {
      onValueChange(nextValue)
    }

    stopDragging()
  }

  const onPanFailed = (_event: HandlerStateChangeEvent<Record<string, unknown>>) => {
    stopDragging()
  }

  const onPanCancelled = (_event: HandlerStateChangeEvent<Record<string, unknown>>) => {
    stopDragging()
  }

  useEffect(() => {
    if (!segmentWidth || !hasSelection || isDragging) return
    Animated.spring(indicatorX, {
      toValue: selectedIndex * segmentWidth,
      useNativeDriver: false,
      damping: 20,
      stiffness: 260,
      mass: 0.7,
    }).start()
  }, [hasSelection, indicatorX, segmentWidth, selectedIndex, isDragging])

  return (
    <GestureHandlerRootView>
      <View style={formFieldStyles.container}>
        <Text style={[formFieldStyles.label, additionalStyle]}>{label}</Text>
        <PanGestureHandler
          onActivated={onActivated}
          onGestureEvent={onPan}
          onEnded={onPanEnd}
          onFailed={onPanFailed}
          onCancelled={onPanCancelled}
        >
          <View
            style={[formFieldStyles.fieldShell, styles.segmentedWrapper, additionalStyle, error && formFieldStyles.errorInput]}
            onLayout={(event) => setWrapperWidth(event.nativeEvent.layout.width)}
          >
            {(hasSelection || isDragging) && segmentWidth > 0 && (
              <Animated.View
                pointerEvents='none'
                style={[
                  styles.selectionIndicator,
                  {
                    left: Animated.multiply(
                      Animated.add(indicatorX, Animated.multiply(dragScale, segmentWidth * -0.075)),
                      1
                    ),
                    width: Animated.multiply(segmentWidth, dragScale),
                    top: Animated.multiply(Animated.subtract(dragScale, 1), -50),
                    bottom: Animated.multiply(Animated.subtract(dragScale, 1), -50),
                  },
                ]}
              >
                <GlassView
                  style={StyleSheet.absoluteFillObject}
                  glassEffectStyle={{ style: 'clear' }}
                  tintColor={'#970a9700'}
                />
              </Animated.View>
            )}

            {options.map((option) => {
              const isActive = option.value === value
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onValueChange(option.value)}
                  style={styles.segmentItem}
                >
                  <Text style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </PanGestureHandler>
        {subtitle && <Text style={formFieldStyles.helperText}>{subtitle}</Text>}
        {error && <Text style={formFieldStyles.errorText}>{error}</Text>}
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  segmentedWrapper: {
    overflow: 'visible',
    position: 'relative',
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  selectionIndicator: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    paddingVertical: 12,
  },
  segmentLabel: {
    color: formFieldColors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: formFieldColors.selectedText,
    fontWeight: '600',
  },
})