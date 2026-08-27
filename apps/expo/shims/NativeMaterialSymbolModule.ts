// Stub for NativeMaterialSymbolModule to avoid crashing in Expo Go.
// The real TurboModule (ReactNavigationMaterialSymbolModule) is only present in a
// native build that includes it (dev client / production). In Expo Go it's missing,
// so TurboModuleRegistry.get(...) returns null — and react-navigation then calls
// `.getImageSource(...)` on that null, which throws
// "Cannot read property 'getImageSource' of null" while rendering the tab bar.
//
// To keep Expo Go usable we export a stub object that implements getImageSource and
// returns `undefined` (no image source), so react-navigation renders the tab without
// a Material Symbol icon instead of crashing. Real builds resolve the actual native
// module below and render icons normally.

import { type TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getImageSource(
    name: string,
    variant: string | undefined,
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | undefined,
    size: number,
    color: Object
  ): string;
}

const nativeModule = TurboModuleRegistry.get<Spec>('ReactNavigationMaterialSymbolModule');

// Fallback used only when the native module isn't in the binary (Expo Go).
const fallback = {
  // react-navigation calls this with a single options object; the args are ignored
  // here. Returning undefined yields no icon rather than a crash.
  getImageSource: () => undefined,
} as unknown as Spec;

export default nativeModule ?? fallback;
