import * as React from 'react'
import { StyleSheet, View, Text, Platform } from 'react-native'
import { WebNavbar } from 'app/components/web-navbar'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { useHeaderHeightSafe } from 'app/navigation/use-header-height'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1d041f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(55, 27, 58, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 32,
    maxWidth: 600,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 24,
  },
})

export function TeamsScreen() {
  const insets = useSafeArea()
  const headerHeight = useHeaderHeightSafe()

  const topOffset = Platform.OS === 'web' ? 80 : Math.max(headerHeight, insets.top) + 16

  return (
    <View style={[styles.container, { paddingTop: topOffset }]}>
      <WebNavbar />
      <View style={styles.card}>
        <Text style={styles.title}>Teams Screen</Text>
        <Text style={styles.subtitle}>
          This is where you will form your project team. Since you are an applicant or hacker, you have permission to access teams!
        </Text>
      </View>
    </View>
  )
}
