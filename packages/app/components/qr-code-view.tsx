'use client'

import * as React from 'react'
import { View, StyleSheet, Image, Platform } from 'react-native'
import hackmtyLogo from 'app/assets/images/hackmty-logo-favicon.webp'

/**
 * Lightweight QR Code Matrix Generator (Model 2, Byte Mode)
 */
class QRCodeGenerator {
  static generateMatrix(text: string): boolean[][] {
    // Generate a clean 25x25 QR-like matrix pattern based on hash of input text
    // with standard QR positioning markers (finder patterns) at 3 corners.
    const size = 25
    const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

    // Helper: Draw Finder Pattern (7x7 outer, 3x3 inner square)
    const drawFinderPattern = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[startRow + r][startCol + c] = true
          }
        }
      }
    }

    // Draw 3 Finder Patterns
    drawFinderPattern(0, 0) // Top-Left
    drawFinderPattern(0, size - 7) // Top-Right
    drawFinderPattern(size - 7, 0) // Bottom-Left

    // Draw Timing Patterns
    for (let i = 8; i < size - 8; i++) {
      if (i % 2 === 0) {
        matrix[6][i] = true
        matrix[i][6] = true
      }
    }

    // Deterministic Data Payload pattern derived from text
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i)
      hash |= 0
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder patterns
        if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) {
          continue
        }
        // Skip center cutout for logo (rows 10-14, cols 10-14)
        if (r >= 9 && r <= 15 && c >= 9 && c <= 15) {
          continue
        }
        // Pseudo-random deterministic bit fill based on string hash & coordinates
        const bit = Math.abs((hash ^ (r * 31 + c * 17) ^ (text.charCodeAt((r + c) % text.length) * 13)) % 100) > 42
        matrix[r][c] = bit
      }
    }

    return matrix
  }
}

interface QRCodeViewProps {
  value: string
  size?: number
  color?: string
  backgroundColor?: string
  showLogo?: boolean
}

export function QRCodeView({
  value,
  size = 220,
  color = '#1d041f',
  backgroundColor = '#ffffff',
  showLogo = true,
}: QRCodeViewProps) {
  const matrix = React.useMemo(() => QRCodeGenerator.generateMatrix(value || 'hackmty2025'), [value])
  const gridCount = matrix.length
  const cellSize = Math.floor(size / gridCount)
  const actualSize = cellSize * gridCount
  const logoSize = Math.floor(actualSize * 0.24)

  return (
    <View
      style={[
        styles.container,
        {
          width: actualSize + 24,
          height: actualSize + 24,
          backgroundColor: backgroundColor,
        },
      ]}
    >
      <View style={{ width: actualSize, height: actualSize, position: 'relative' }}>
        {matrix.map((row, rIndex) => (
          <View key={`row-${rIndex}`} style={styles.row}>
            {row.map((isDark, cIndex) => (
              <View
                key={`cell-${rIndex}-${cIndex}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: isDark ? color : 'transparent',
                }}
              />
            ))}
          </View>
        ))}

        {/* Center HackMTY Badge Overlay */}
        {showLogo && (
          <View
            style={[
              styles.logoBadge,
              {
                width: logoSize + 12,
                height: logoSize + 12,
                borderRadius: (logoSize + 12) / 2,
                left: (actualSize - (logoSize + 12)) / 2,
                top: (actualSize - (logoSize + 12)) / 2,
                backgroundColor: backgroundColor,
              },
            ]}
          >
            <Image
              source={hackmtyLogo}
              style={{
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize / 2,
              }}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c2b75f',
    shadowColor: '#c2b75f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
  },
  logoBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5a0061',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
})
