'use client';
import React, { useRef } from 'react';
import {
  Animated,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

type ParallaxScrollViewProps = {
  background: React.ReactNode;
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
  keyboardVerticalOffset?: number;
};

/**
 * Native implementation: Animated.ScrollView tracks scrollY,
 * background uses translateY to counteract scroll (appears pinned),
 * content overlaps via negative marginTop.
 */
export function ParallaxScrollView({
  background,
  children,
  contentContainerStyle,
  style,
  keyboardVerticalOffset = 100,
}: ParallaxScrollViewProps) {
  const scrollY = useRef(new Animated.Value(0)).current;

  return (
    <Animated.ScrollView
      style={[{ flex: 1,  }, style]}
      contentContainerStyle={{ flexGrow: 1, overflow: 'visible' }}
      keyboardShouldPersistTaps="handled"
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      automaticallyAdjustKeyboardInsets={true}
      scrollEventThrottle={16}
    >
      {/* Background pinned to viewport by counteracting scroll */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateY: scrollY }],
        }}
      >
        {background}
      </Animated.View>

      {/* Foreground content in normal flow */}
      <Animated.View style={[{ flexGrow: 1 }, contentContainerStyle]}>
        {children}
      </Animated.View>
    </Animated.ScrollView>
  );
}