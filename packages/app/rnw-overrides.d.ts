// override react-native types with react-native-web types
import 'react-native'

declare module 'react-native' {
  interface PressableStateCallbackType {
    hovered?: boolean
    focused?: boolean
  }
  interface ViewStyle {
    position?: 'absolute' | 'relative' | 'static' | 'fixed' | undefined
    transitionProperty?: string
    transitionDuration?: string
    boxShadow?: string
    outlineStyle?: string
  }
  interface TextProps {
    accessibilityComponentType?: never
    accessibilityTraits?: never
    href?: string
    hrefAttrs?: {
      rel: 'noreferrer'
      target?: '_blank'
    }
  }
  interface ViewProps {
    accessibilityRole?: string
    href?: string
    hrefAttrs?: {
      rel: 'noreferrer'
      target?: '_blank'
    }
    onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void
  }
}

declare module 'qrcode' {
  const QRCode: any
  export default QRCode
}
