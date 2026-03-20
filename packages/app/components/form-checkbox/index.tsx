import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet, Text, Pressable, View, Platform } from 'react-native';

export function FormCheckbox({ label, value, onValueChange, additionalStyle = {}, error }: { label: ReactNode; value?: boolean; onValueChange?: (v: boolean) => void; additionalStyle?: any; error?: string }) {
  const isControlled = typeof value !== 'undefined'
  const [internalValue, setInternalValue] = useState<boolean>(!!value)

  useEffect(() => {
    if (isControlled) setInternalValue(!!value)
  }, [isControlled, value])

  const checked = isControlled ? !!value : internalValue

  const setChecked = (next: boolean) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  // helper used in the wrapper press handler below.  On the web we
  // need to ignore taps that originate from interactive descendants
  // (links/buttons) because the user wants to follow the link instead of
  // toggling the checkbox.  When the tap comes from a native mobile
  // component `target` will be a numeric React tag so the check is a no‑op.
  const shouldIgnorePress = (e: any) => {
    if (Platform.OS === 'web') {
      const tag = e.nativeEvent?.target?.tagName?.toLowerCase();
      // anchors are the most common; if you render other touchable
      // elements inside the label you can expand this list.
      if (tag === 'a' || tag === 'button' || tag === 'input') {
        return true;
      }
    }
    return false;
  };

  const handleContainerPress = (e: any) => {
    if (shouldIgnorePress(e)) {
      // let the child handle the event – do not toggle the box
      return;
    }
    setChecked(!checked);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={[styles.container, additionalStyle]}
        onPress={handleContainerPress}
      >
        {/* Custom Square Box */}
        <View style={[
          styles.checkboxBase,
          checked && styles.checkboxChecked,
          error && styles.checkboxError
        ]}>
          {checked && <View style={styles.checkmark} />}
        </View>

        {typeof label === 'string' ? (
          <Text style={styles.label}>{label}</Text>
        ) : (
          <View>{label}</View>
        )}

        {/* Hidden input for Web Accessibility / SEO */}
        {Platform.OS === 'web' && (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
        )}
      </Pressable>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  checkboxBase: {
    width: 20,
    height: 20,
    borderRadius: 4, // "Nice square" with a tiny bit of rounding
    borderWidth: 2,
    borderColor: '#FFFFFF', // Clean white outline
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#461184', // HackMTY Blue
    borderColor: '#461184',
  },
  checkboxError: {
    borderColor: '#ff6b6b',
  },
  checkmark: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: -0.2,
    flexShrink: 1, // Prevents text from pushing off screen on mobile
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 32,
  },
});