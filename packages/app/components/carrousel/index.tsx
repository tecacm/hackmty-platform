'use client';

import { View, Dimensions, Animated, Platform } from 'react-native';
import { SolitoImage } from 'solito/image';
import { useEffect, useState, useRef } from 'react';

type CarouselProps = {
  slideImages: any[];
  scrollInterval?: number;
  mode?: 'slide' | 'crossfade';
};

// Global memory cache to hold instantiated Image objects on Web.
// Keeps textures decoded in browser RAM across page transitions (/login <-> /register <-> /forgot-password)
// so navigating auth screens never re-requests or re-decodes images.
const globalImageMemoryMap = new Map<string, any>();

function preloadSlideImages(images: any[]) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  images.forEach((item) => {
    const src = item?.src || item?.default || item;
    if (typeof src === 'string' && src && !globalImageMemoryMap.has(src)) {
      const img = new Image();
      img.src = src;
      globalImageMemoryMap.set(src, img);
    }
  });
}

function CrossfadeCarrousel({ slideImages, secondsPerImage = 6 }: { slideImages: any[]; secondsPerImage?: number }) {
  const total = slideImages.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const incomingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    preloadSlideImages(slideImages);
  }, [slideImages]);

  useEffect(() => {
    if (total < 2) return;

    let cancelled = false;
    const totalMs = secondsPerImage * 1000;
    const fadeMs = totalMs * 0.4;
    const holdMs = totalMs - fadeMs;

    incomingOpacity.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(holdMs),
      Animated.timing(incomingOpacity, { toValue: 1, duration: fadeMs, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !cancelled) {
        setCurrentIndex((i) => (i + 1) % total);
      }
    });

    return () => {
      cancelled = true;
      animation.stop();
    };
  }, [currentIndex, total, secondsPerImage]);

  if (total === 0) return null;

  const resolveSrc = (item: any) => {
    const s = item?.src || item?.default || item;
    return typeof s === 'string' ? s : s?.src || ''
  }

  const currentUri = resolveSrc(slideImages[currentIndex]);
  const nextIndex = (currentIndex + 1) % total;
  const nextUri = resolveSrc(slideImages[nextIndex]);

  const layerStyle = {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: Platform.OS === 'web' ? -200 : 0,
    width: Platform.OS === 'web' ? '100vw' : '100%',
    height: Platform.OS === 'web' ? 'calc(100vh + 200px)' : '100%',
    minHeight: Platform.OS === 'web' ? 'calc(100vh + 200px)' : '100%',
    zIndex: -1,
  } as any;

  return (
    <View style={{ width: '100%', height: '100%', overflow: 'visible', position: 'relative' }}>
      <View
        style={[
          layerStyle,
          Platform.OS === 'web' && {
            backgroundImage: `url(${currentUri})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            WebkitTransform: 'translateZ(0)',
          } as any,
        ]}
      />
      {total > 1 && (
        <Animated.View
          style={[
            layerStyle,
            { opacity: incomingOpacity },
            Platform.OS === 'web' && {
              backgroundImage: `url(${nextUri})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              WebkitTransform: 'translateZ(0)',
            } as any,
          ]}
        />
      )}
    </View>
  );
}

export function Carrousel(props: CarouselProps) {
  if (props.mode === 'crossfade') {
    return <CrossfadeCarrousel slideImages={props.slideImages} />;
  }

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
