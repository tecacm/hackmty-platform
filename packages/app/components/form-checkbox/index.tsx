import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet, Text, Pressable, View, Platform } from 'react-native';
import { formFieldColors } from '../form-field-styles'

export function FormCheckbox({ label, value, onValueChange, additionalStyle = {}, error, variant = 'default', required = false }: { label: ReactNode; value?: boolean; onValueChange?: (v: boolean) => void; additionalStyle?: any; error?: string; variant?: 'default' | 'form'; required?: boolean }) {
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
          checked && (variant === 'form' ? styles.checkboxCheckedForm : styles.checkboxCheckedDefault),
          error && styles.checkboxError
        ]}>
          {checked && <View style={variant === 'form' ? styles.checkmarkForm : styles.checkmarkDefault} />}
        </View>

        {typeof label === 'string' ? (
          <Text style={variant === 'form' ? styles.labelForm : styles.labelDefault}>
            {label}
            {required && <Text style={{ color: formFieldColors.error }}>{' *'}</Text>}
          </Text>
        ) : (
          <Text style={{ flex: 1, flexShrink: 1 }}>
            {label}
            {required && (
              <Text style={[
                variant === 'form' ? styles.labelForm : styles.labelDefault,
                { color: formFieldColors.error }
              ]}>
                {' *'}
              </Text>
            )}
          </Text>
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
    borderRadius: 4,
    borderWidth: 2,
    borderColor: formFieldColors.borderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  checkboxCheckedForm: {
    backgroundColor: formFieldColors.theme,
    borderColor: formFieldColors.theme,
  },
  checkboxCheckedDefault: {
    backgroundColor: '#461184',
    borderColor: '#461184',
  },
  checkboxError: {
    borderColor: formFieldColors.error,
  },
  checkmarkForm: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: formFieldColors.selectedText,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  checkmarkDefault: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  labelForm: {
    color: formFieldColors.titleText,
    fontSize: 14,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  labelDefault: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 32,
  },
});