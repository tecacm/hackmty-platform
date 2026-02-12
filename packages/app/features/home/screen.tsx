'use client'

import { TextLink } from 'solito/link'
import { ScrollView, Text, View } from 'react-native'
import { SolitoImage } from 'solito/image'
import { LinearGradient } from 'app/components/linear-gradient'
import logoImage from 'app/assets/images/hackmty-logo.webp'

export function HomeScreen() {
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
        <View style ={{ flex: 1, padding: 16, alignItems: 'center', gap: 16 }}>
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
