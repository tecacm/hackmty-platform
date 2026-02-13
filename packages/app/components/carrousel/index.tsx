'use client';

import { View, Dimensions, Animated } from 'react-native';
import { SolitoImage } from 'solito/image';
import { useEffect, useState, useRef } from 'react';

type CarouselProps = {
  slideImages: any[];
  scrollInterval?: number;
};

export function Carrousel(props: CarouselProps) {
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(1200);

  const animatedX = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(1);
  const total = props.slideImages.length;

  // Clone: [lastSlide, ...originals, firstSlide]
  const slides = total > 0
    ? [props.slideImages[total - 1], ...props.slideImages, props.slideImages[0]]
    : [];

  useEffect(() => {
    const update = () => {
      const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
      setWidth(windowWidth);
      setHeight(windowHeight);
    };
    update();
    const sub = Dimensions.addEventListener('change', update);
    return () => sub?.remove();
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
        width,
        height,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: width * slides.length,
          height,
          transform: [{ translateX: animatedX }],
        }}
      >
        {slides.map((item, index) => {
          const src = item?.src || item?.default || item;
          return (
            <View
              key={index}
              style={{
                width,
                height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                zIndex: -2,
              }}
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
