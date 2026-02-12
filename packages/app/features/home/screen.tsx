'use client'

import { TextLink } from 'solito/link'
import { ScrollView, Text, View } from 'react-native'
import { SolitoImage } from 'solito/image'
import { LinearGradient } from 'app/components/linear-gradient'
import logoImage from 'app/assets/images/hackmty-logo.webp'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'

export function HomeScreen() {
    const insets = useSafeArea();

  return (
      <LinearGradient
        colors={['#662d91', '#946cb2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flex: 1,
          flexBasis: 0
        }}
      >

      <ScrollView>
        <View style ={{ 
          flex: 1, alignItems: 'center', gap: 16,
            paddingTop: insets.top + 100,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
         }}>
        <SolitoImage 
          src={logoImage} 
          height={200}
          width={100}
          alt={"The HackMTY Logo"}
        />      
        <H1>HackMTY</H1>
        <View style={{ maxWidth: 600, gap: 16 }}>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>El HackMTY es un evento de hackathon organizado por estudiantes del Tecnológico de Monterrey.</P>
          <P>Hi :D</P>
        </View>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const H1 = ({ children }: { children: React.ReactNode }) => {
  return <Text style={{ fontWeight: '800', fontSize: 24, color : 'white'}}>{children}</Text>
}

const P = ({ children }: { children: React.ReactNode }) => {
  return <Text style={{ textAlign: 'center' }}>{children}</Text>
}
