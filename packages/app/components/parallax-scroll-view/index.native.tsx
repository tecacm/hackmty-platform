'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Dimensions,
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
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);

  useEffect(() => {
    const update = () => {
      const { width, height } = Dimensions.get('window');
      setScreenWidth(width);
      setScreenHeight(height);
    };
    update();
    const sub = Dimensions.addEventListener('change', update);
    return () => sub?.remove();
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <Animated.ScrollView
        style={[{ flex: 1, overflow: 'visible' }, style]}
        contentContainerStyle={{ overflow: 'visible' }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Background: pinned in place via translateY counteracting scroll */}
        <Animated.View
          style={{
            width: screenWidth,
            height: screenHeight,
            zIndex: -1,
            transform: [{ translateY: scrollY }],
          }}
        >
          {background}
        </Animated.View>

        {/* Content overlaps carousel area via negative margin */}
        <View
          style={[
            {
              marginTop: -screenHeight,
              minHeight: screenHeight,
              overflow: 'visible',
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}
