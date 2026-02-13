'use client'

import { TextLink } from 'solito/link'
import { Text, View } from 'react-native'
import { SolitoImage } from 'solito/image'
import { LinearGradient } from 'app/components/linear-gradient'
import logoImage from 'app/assets/images/hackmty-logo.webp'
import rectoria from 'app/assets/images/login-screen/rectoria.webp'
import pavoreal from 'app/assets/images/login-screen/pavoreal.webp'
import ciap from 'app/assets/images/login-screen/ciap.webp'
import photo2024 from 'app/assets/images/login-screen/2024photo.webp'
import skyview from 'app/assets/images/login-screen/skyview.webp'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { Carrousel } from 'app/components/carrousel'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'

export function HomeScreen() {
    const insets = useSafeArea();
    const images = [rectoria, pavoreal, ciap, photo2024, skyview];

  const background = (
    <>
      <Carrousel slideImages={images} />
      <LinearGradient
        colors={['rgba(29, 4, 31, 0.5)', 'rgba(55, 27, 58, 0.7)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
    </>
  );

  return (
    <ParallaxScrollView
      background={background}
      style={{ backgroundColor: '#1d041f' }}
      contentContainerStyle={{
        alignItems: 'center',
        gap: 16,
        paddingTop: insets.top + 100,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
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
    </ParallaxScrollView>
  )
}

const H1 = ({ children }: { children: React.ReactNode }) => {
  return <Text style={{ fontWeight: '800', fontSize: 24, color : 'white'}}>{children}</Text>
}

const P = ({ children }: { children: React.ReactNode }) => {
  return <Text style={{ textAlign: 'center' }}>{children}</Text>
}
