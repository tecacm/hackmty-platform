'use client'

import * as React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

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

function colorFor(datum: ChartDatum, index: number, colors: string[], muted: string): string {
  if (datum.key === '__unspecified__' || datum.key === '__others__') return muted
  return colors[index % colors.length] ?? muted
}

export function DistributionChart({ title, subtitle, kind, data, total, colors, mutedColor = MUTED }: DistributionChartProps) {
  const pct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0)

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {kind === 'options' ? (
        <>
          <View style={styles.donutWrap}>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d, i) => (
                    <Cell key={d.key} fill={colorFor(d, i, colors, mutedColor)} />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ zIndex: 50 }}
                  formatter={(value: any, name: any) => [`${value} (${pct(Number(value))}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <View style={styles.donutCenter} pointerEvents="none">
              <Text style={styles.donutCenterValue}>{total}</Text>
            </View>
          </View>

          <View style={styles.legend}>
            {data.map((d, i) => (
              <View key={d.key} style={styles.legendRow}>
                <View style={[styles.swatch, { backgroundColor: colorFor(d, i, colors, mutedColor) }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>{d.label}</Text>
                <Text style={styles.legendValue}>{d.count} · {pct(d.count)}%</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={{ marginTop: 8 }}>
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 52, bottom: 4, left: 8 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tick={{ fontSize: 12, fill: '#334155' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip wrapperStyle={{ zIndex: 50 }} formatter={(value: any) => [`${value} (${pct(Number(value))}%)`, '']} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                {data.map((d, i) => (
                  <Cell key={d.key} fill={colorFor(d, i, colors, mutedColor)} />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  formatter={(v: any) => `${v} · ${pct(Number(v))}%`}
                  style={{ fontSize: 11, fontWeight: 700, fill: '#5a0061' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </View>
      )}
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
  title: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2, marginBottom: 8 },
  donutWrap: {
    width: '100%',
    height: 190,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  donutCenterValue: { color: '#0f172a', fontSize: 24, fontWeight: '900' },
  legend: {
    marginTop: 12,
    gap: 7,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { color: '#334155', fontSize: 13, fontWeight: '700', flex: 1 },
  legendValue: { color: '#5a0061', fontSize: 12, fontWeight: '800' },
})
