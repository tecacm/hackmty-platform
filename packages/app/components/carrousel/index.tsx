'use client';

import { View, Dimensions, Animated, Platform } from 'react-native';
import { SolitoImage } from 'solito/image';
import { useEffect, useState, useRef } from 'react';

type CarouselProps = {
  slideImages: any[];
  scrollInterval?: number;
};

export function Carrousel(props: CarouselProps) {
  // SSR-safe: start with 0, real values set in useEffect
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const animatedX = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(1);
  const total = props.slideImages.length;

  // Clone: [lastSlide, ...originals, firstSlide]
  const slides = total > 0
    ? [props.slideImages[total - 1], ...props.slideImages, props.slideImages[0]]
    : [];

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const update = () => {
        setWidth(window.innerWidth);
        setHeight(window.innerHeight);
      };
      update();
      window.addEventListener('resize', update);
      window.addEventListener('orientationchange', update);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
      };
    } else {
      const update = () => {
        const { width: w, height: h } = Dimensions.get('screen');
        setWidth(w);
        setHeight(h);
      };
      update();
      const sub = Dimensions.addEventListener('change', update);
      return () => sub?.remove();
    }
  }, []);

  // Jump to real first slide (index 1) on mount without animation
  useEffect(() => {
    if (width > 0) {
      animatedX.setValue(-width);
    }
  }, [width, animatedX]);

  useEffect(() => {
    if (total === 0) return;

    const timer = setInterval(() => {
      let nextIndex = indexRef.current + 1;
      indexRef.current = nextIndex;

      Animated.timing(animatedX, {
        toValue: -nextIndex * width,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // If we just scrolled to the cloned first slide (at end),
      // silently jump back to the real first slide after animation
      if (nextIndex >= total + 1) {
        setTimeout(() => {
          indexRef.current = 1;
          animatedX.setValue(-width);
        }, 400);
      }
    }, props.scrollInterval || 5000);

    return () => clearInterval(timer);
  }, [total, width, animatedX]);

  return (
    <View
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: width * slides.length,
          height: '100%',
          transform: [{ translateX: animatedX }],
        } as any}
      >
        {slides.map((item, index) => {
          const src = item?.src || item?.default || item;
          return (
            <View
              key={index}
              style={{
                width: width || '100vw',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              } as any}
            >
              <SolitoImage
                src={src}
                width={width}
                height={height}
                contentFit={"cover"}
                alt={`Slide image ${index}`}
              />
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
};
