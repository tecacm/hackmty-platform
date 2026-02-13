// Stub for NativeMaterialSymbolModule to avoid crash in Expo Go
// The real module requires native code not available in Expo Go

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

// Use `get` instead of `getEnforcing` so it returns null instead of crashing
export default TurboModuleRegistry.get<Spec>(
  'ReactNavigationMaterialSymbolModule'
);
