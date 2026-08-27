'use client';

import { View, Dimensions, Animated, Platform } from 'react-native';
import { SolitoImage } from 'solito/image';
import { useEffect, useLayoutEffect, useState, useRef } from 'react';

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

// Runs before paint on web, falls back to a normal effect during SSR/native so
// the opacity reset lands in the same commit as the currentIndex change.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// WEB crossfade: two fixed background-image layers. The current sits opaque
// underneath while the next fades in on top; the incoming opacity is zeroed in the
// same commit that advances currentIndex (layout effect) so no stale frame paints.
function WebCrossfade({ slideImages, secondsPerImage = 6 }: { slideImages: any[]; secondsPerImage?: number }) {
  const total = slideImages.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const incomingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    preloadSlideImages(slideImages);
  }, [slideImages]);

  useIsomorphicLayoutEffect(() => {
    incomingOpacity.setValue(0);
  }, [currentIndex]);

  useEffect(() => {
    if (total < 2) return;
    let cancelled = false;
    const totalMs = secondsPerImage * 1000;
    const fadeMs = totalMs * 0.4;
    const holdMs = totalMs - fadeMs;
    const animation = Animated.sequence([
      Animated.delay(holdMs),
      Animated.timing(incomingOpacity, { toValue: 1, duration: fadeMs, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !cancelled) setCurrentIndex((i) => (i + 1) % total);
    });
    return () => {
      cancelled = true;
      animation.stop();
    };
  }, [currentIndex, total, secondsPerImage]);

  if (total === 0) return null;

  const resolveSrc = (item: any) => {
    const s = item?.src || item?.default || item;
    return typeof s === 'string' ? s : s?.src || '';
  };
  const currentUri = resolveSrc(slideImages[currentIndex]);
  const nextUri = resolveSrc(slideImages[(currentIndex + 1) % total]);

  const layerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: -200,
    width: '100vw',
    height: 'calc(100vh + 200px)',
    minHeight: 'calc(100vh + 200px)',
    zIndex: -1,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    WebkitTransform: 'translateZ(0)',
  } as any;

  return (
    <View style={{ width: '100%', height: '100%', overflow: 'visible', position: 'relative' }}>
      <View style={[layerStyle, { backgroundImage: `url(${currentUri})` } as any]} />
      {total > 1 && (
        <Animated.View style={[layerStyle, { opacity: incomingOpacity, backgroundImage: `url(${nextUri})` } as any]} />
      )}
    </View>
  );
}

// NATIVE crossfade — ping-pong two-layer design that keeps the working Animated.View
// opacity fade but removes the flicker. The key property: a layer NEVER changes its
// image source while it is visible. The layer that just faded in (already decoded)
// simply becomes the new base, untouched; the other layer only swaps its source while
// it is fully transparent, so any re-decode happens invisibly. The fading layer is
// always kept on top via zIndex (two layers, positive z — safe on Android).
function NativeCrossfade({ slideImages, secondsPerImage = 6 }: { slideImages: any[]; secondsPerImage?: number }) {
  const total = slideImages.length;
  const resolveRaw = (item: any) => item?.src || item?.default || item;

  const [dim, setDim] = useState({ w: 0, h: 0 });
  // Two persistent layers, each with its own source slot and opacity.
  const [srcs, setSrcs] = useState<[any, any]>(() => [
    resolveRaw(slideImages[0]),
    resolveRaw(slideImages[total > 1 ? 1 : 0]), // layer 1 preloads the next image
  ]);
  const [active, setActive] = useState(0); // which layer is the visible base (opacity 1)
  const opacities = useRef<[Animated.Value, Animated.Value]>([
    new Animated.Value(1),
    new Animated.Value(0),
  ]).current;

  const activeRef = useRef(0);
  const indexRef = useRef(0);
  const slidesRef = useRef(slideImages);
  slidesRef.current = slideImages;

  useEffect(() => {
    const update = () => {
      const { width: w, height: h } = Dimensions.get('screen');
      setDim({ w, h });
    };
    update();
    const sub = Dimensions.addEventListener('change', update);
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (total < 2) return;
    const totalMs = secondsPerImage * 1000;
    const fadeMs = totalMs * 0.4;
    const holdMs = totalMs - fadeMs;
    let cancelled = false;
    let anim: Animated.CompositeAnimation | undefined;

    const cycle = () => {
      if (cancelled) return;
      const activeLayer = activeRef.current;
      const idleLayer = 1 - activeLayer; // hidden layer already holding the next image
      anim = Animated.sequence([
        Animated.delay(holdMs),
        Animated.timing(opacities[idleLayer]!, { toValue: 1, duration: fadeMs, useNativeDriver: true }),
      ]);
      anim.start(({ finished }) => {
        if (!finished || cancelled) return;
        // The idle layer is now fully faded in → it becomes the visible base.
        opacities[activeLayer]!.setValue(0); // hide the old base (invisible beneath the new one)
        activeRef.current = idleLayer;
        setActive(idleLayer);
        indexRef.current = (indexRef.current + 1) % total;
        // Preload the FOLLOWING image into the now-idle (old base) layer while it is
        // transparent, so its re-decode is never seen.
        const followingSrc = resolveRaw(slidesRef.current[(indexRef.current + 1) % total]);
        setSrcs((prev) => {
          const next: [any, any] = [prev[0], prev[1]];
          next[activeLayer] = followingSrc;
          return next;
        });
        cycle();
      });
    };

    cycle();
    return () => {
      cancelled = true;
      anim?.stop();
    };
  }, [total, secondsPerImage]);

  if (total === 0) return null;

  const layerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: dim.w || '100%',
    height: dim.h || '100%',
  } as any;

  return (
    <View style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {[0, 1].map((i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[layerStyle, { opacity: opacities[i], zIndex: i === active ? 1 : 2 }]}
        >
          <SolitoImage
            src={srcs[i]}
            width={dim.w}
            height={dim.h}
            contentFit="cover"
            alt={`Slide layer ${i}`}
          />
        </Animated.View>
      ))}
    </View>
  );
}

export function Carrousel(props: CarouselProps) {
  if (props.mode === 'crossfade') {
    return Platform.OS === 'web'
      ? <WebCrossfade slideImages={props.slideImages} />
      : <NativeCrossfade slideImages={props.slideImages} />;
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
