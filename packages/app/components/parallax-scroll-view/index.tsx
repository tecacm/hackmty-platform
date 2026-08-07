'use client';

import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { View, ScrollView, Dimensions, ViewStyle } from 'react-native';

type ParallaxScrollViewProps = {
  background: ReactNode;
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
};

/**
 * Web implementation: background is fixed in place using position: 'fixed',
 * content scrolls naturally on top.
 */
export function ParallaxScrollView({
  background,
  children,
  contentContainerStyle,
  style,
}: ParallaxScrollViewProps) {
  const [screenHeight, setScreenHeight] = useState(0);

  useEffect(() => {
    const update = () => setScreenHeight(Dimensions.get('window').height);
    update();
    const sub = Dimensions.addEventListener('change', update);
    return () => sub?.remove();
  }, []);

  return (
    <View style={[{ flex: 1, position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }, style]}>
      {/* Background: fixed in place */}
      <View
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          maxHeight: '100dvh',
          zIndex: -1,
          overflow: 'hidden',
          pointerEvents: 'none',
        } as any}
      >
        {background}
      </View>

      {/* Scrollable content on top */}
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}
