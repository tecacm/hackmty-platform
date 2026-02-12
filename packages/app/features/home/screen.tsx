'use client'

import { TextLink } from 'solito/link'
import { Text, View } from 'react-native'
import { SolitoImage } from 'solito/image'
import logoImage from 'app/assets/images/hackmty-logo.webp'

export function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        gap: 32,
      }}
    >
      <SolitoImage 
        src={logoImage} 
        height={200}
        width={100}
        alt={"The HackMTY Logo"}
      />      
      <H1>HackMTY</H1>
      <View style={{ maxWidth: 600, gap: 16 }}>
      </View>
    </View>
  )
}

const H1 = ({ children }: { children: React.ReactNode }) => {
  return <Text style={{ fontWeight: '800', fontSize: 24 }}>{children}</Text>
}

const P = ({ children }: { children: React.ReactNode }) => {
  return <Text style={{ textAlign: 'center' }}>{children}</Text>
}
