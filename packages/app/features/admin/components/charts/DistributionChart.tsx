import * as React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export type ChartDatum = { key: string; label: string; count: number }

export interface DistributionChartProps {
  title: string
  subtitle?: string
  kind: 'options' | 'text'
  data: ChartDatum[]
  total: number
  colors: string[]
  mutedColor?: string
}

const MUTED = '#cbd5e1'

// Native fallback: recharts is DOM/SVG and web-only, so on native we render a
// compact ranked list with proportional bars using RN primitives. The web build
// resolves DistributionChart.web.tsx (recharts donuts/bars) instead.
export function DistributionChart({ title, subtitle, data, total, colors, mutedColor = MUTED }: DistributionChartProps) {
  const pct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0)
  const colorFor = (d: ChartDatum, i: number) =>
    d.key === '__unspecified__' || d.key === '__others__' ? mutedColor : colors[i % colors.length]

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={{ marginTop: 12, gap: 10 }}>
        {data.map((d, i) => (
          <View key={d.key}>
            <View style={styles.labelRow}>
              <Text style={styles.label} numberOfLines={1}>{d.label}</Text>
              <Text style={styles.value}>{d.count} · {pct(d.count)}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct(d.count)}%`, backgroundColor: colorFor(d, i) }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexGrow: 1,
    flexBasis: 320,
    minWidth: 280,
    maxWidth: 520,
  },
  title: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', flex: 1 },
  value: { color: '#5a0061', fontSize: 12, fontWeight: '800' },
  track: { height: 12, borderRadius: 6, backgroundColor: '#f1f5f9', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, minWidth: 2 },
})
