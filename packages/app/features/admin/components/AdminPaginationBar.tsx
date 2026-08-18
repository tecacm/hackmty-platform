'use client'

import * as React from 'react'
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native'
import { PillButton } from '../../../components/pill-button'
import { AppIcon } from '../../../components/app-icon'
import { useTranslation } from 'app/i18n'

export interface AdminPaginationBarProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
}

export function AdminPaginationBar({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: AdminPaginationBarProps) {
  const { width } = useWindowDimensions()
  const { t } = useTranslation()
  const isSmallScreen = width > 0 && width < 640

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)
  const prevDisabled = currentPage <= 1
  const nextDisabled = currentPage >= totalPages

  return (
    <View style={[styles.paginationCard, isSmallScreen && styles.paginationCardSmall]}>
      <Text style={[styles.paginationInfoText, isSmallScreen && styles.textCenter]}>
        {t('admin.paginationShowing', [startItem, endItem, totalItems])}
      </Text>

      <View style={[styles.paginationControlsRow, isSmallScreen && styles.controlsRowSmall]}>
        {/* Page Size Options */}
        <View style={[styles.pageSizeSelector, isSmallScreen && styles.centeredRow]}>
          <Text style={styles.pageSizeLabel}>{t('admin.paginationRows')}</Text>
          {pageSizeOptions.map((sz) => (
            <Pressable
              key={sz}
              onPress={() => {
                onPageSizeChange(sz)
                onPageChange(1)
              }}
              style={[styles.pageSizeOption, pageSize === sz && styles.pageSizeOptionActive]}
            >
              <Text style={[styles.pageSizeOptionText, pageSize === sz && styles.pageSizeOptionTextActive]}>
                {sz}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Page Prev/Next Controls */}
        <View style={[styles.pageButtonsRow, isSmallScreen && styles.centeredRow]}>
          <PillButton
            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={prevDisabled}
            additionalStyle={[
              styles.pageBtn,
              prevDisabled && styles.pageBtnDisabled,
              isSmallScreen && styles.pageBtnSmall,
            ]}
            fontSize={12}
          >
            <View style={styles.btnContentRow}>
              <AppIcon name="chevron.left" size={14} color={prevDisabled ? '#475569' : '#ffffff'} />
              {!isSmallScreen ? <Text style={[styles.btnText, prevDisabled && styles.btnTextDisabled]}>{t('admin.paginationPrev')}</Text> : null}
            </View>
          </PillButton>

          <Text style={styles.pageIndicatorText}>
            {t('admin.paginationPage', [currentPage, Math.max(1, totalPages)])}
          </Text>

          <PillButton
            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={nextDisabled}
            additionalStyle={[
              styles.pageBtn,
              nextDisabled && styles.pageBtnDisabled,
              isSmallScreen && styles.pageBtnSmall,
            ]}
            fontSize={12}
          >
            <View style={styles.btnContentRow}>
              {!isSmallScreen ? <Text style={[styles.btnText, nextDisabled && styles.btnTextDisabled]}>{t('admin.paginationNext')}</Text> : null}
              <AppIcon name="chevron.right" size={14} color={nextDisabled ? '#475569' : '#ffffff'} />
            </View>
          </PillButton>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  paginationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    width: '100%',
    marginTop: 16,
  },
  paginationCardSmall: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  paginationInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },
  textCenter: {
    textAlign: 'center',
  },
  paginationControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  controlsRowSmall: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  pageSizeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centeredRow: {
    justifyContent: 'center',
    width: '100%',
  },
  pageSizeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777777',
    marginRight: 2,
  },
  pageSizeOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  pageSizeOptionActive: {
    backgroundColor: '#5a0061',
  },
  pageSizeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  pageSizeOptionTextActive: {
    color: '#ffffff',
  },
  pageButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22002c',
  },
  pageBtn: {
    height: 34,
    paddingHorizontal: 12,
    width: 'auto',
  },
  pageBtnSmall: {
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  btnTextDisabled: {
    color: '#1e293b',
  },
})
