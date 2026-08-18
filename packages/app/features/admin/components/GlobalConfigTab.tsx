'use client'

import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native'
import { supabase, isSupabaseConfigured } from 'app/lib/supabase'
import { AppIcon } from 'app/components/app-icon'
import { invalidateGlobalEventConfigCache } from 'app/utils/event-config'
import { useTranslation } from 'app/i18n'

export interface ConfigItem {
  key: string
  value: string
  title?: string | null
  description?: string | null
  value_type?: 'boolean' | 'datetime' | 'number' | 'string' | string | null
}

function toDatetimeLocal(isoString?: string | null): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch (e) {
    return ''
  }
}

function fromDatetimeLocal(localValue: string): string {
  if (!localValue) return ''
  try {
    const d = new Date(localValue)
    if (isNaN(d.getTime())) return localValue
    return d.toISOString()
  } catch (e) {
    return localValue
  }
}

export function GlobalConfigTab() {
  const { t } = useTranslation()
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Custom Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState<'boolean' | 'datetime' | 'number' | 'string'>('string')
  const [newValue, setNewValue] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fetchConfigs = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('global_config')
        .select('*')
        .order('key', { ascending: true })

      if (error) throw error

      if (data) {
        setConfigs(data as ConfigItem[])
        const initialDrafts: Record<string, string> = {}
        data.forEach((item) => {
          initialDrafts[item.key] = item.value || ''
        })
        setDraftValues(initialDrafts)
      }
    } catch (err: any) {
      console.error('Failed to load global configs:', err)
      Alert.alert('Error', err?.message || 'Could not load global configuration')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  // Check if draft has unsaved changes
  const isDirty = useMemo(() => {
    return configs.some((item) => (draftValues[item.key] ?? '') !== (item.value ?? ''))
  }, [configs, draftValues])

  const handleUpdateDraft = (key: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleDiscardChanges = () => {
    const original: Record<string, string> = {}
    configs.forEach((item) => {
      original[item.key] = item.value || ''
    })
    setDraftValues(original)
  }

  const handleSaveAll = async () => {
    if (!isDirty) return

    setSaving(true)
    try {
      // Build batch payload
      const upsertPayload = configs.map((item) => ({
        key: item.key,
        value: (draftValues[item.key] ?? '').trim(),
        title: item.title,
        description: item.description,
        value_type: item.value_type || 'string',
      }))

      const { error } = await supabase
        .from('global_config')
        .upsert(upsertPayload, { onConflict: 'key' })

      if (error) throw error

      invalidateGlobalEventConfigCache()
      await fetchConfigs()
      Alert.alert('Saved Successfully', 'All global configuration changes have been published.')
    } catch (err: any) {
      console.error('Failed to save global configs:', err)
      Alert.alert('Save Failed', err?.message || 'Could not save global configuration changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteKey = async (key: string) => {
    Alert.alert(
      'Delete Config Key',
      `Are you sure you want to delete "${key}" from the global configuration?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('global_config')
                .delete()
                .eq('key', key)

              if (error) throw error

              invalidateGlobalEventConfigCache()
              fetchConfigs()
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete setting')
            }
          },
        },
      ]
    )
  }

  const handleCreateConfig = async () => {
    if (!newKey.trim()) {
      Alert.alert('Required', 'Please enter a valid configuration key identifier')
      return
    }

    setIsAdding(true)
    try {
      const { error } = await supabase
        .from('global_config')
        .upsert(
          {
            key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
            value: newValue.trim(),
            title: newTitle.trim() || newKey.trim(),
            description: newDesc.trim() || null,
            value_type: newType,
          },
          { onConflict: 'key' }
        )

      if (error) throw error

      invalidateGlobalEventConfigCache()
      setIsModalOpen(false)
      setNewKey('')
      setNewTitle('')
      setNewDesc('')
      setNewType('string')
      setNewValue('')
      await fetchConfigs()
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create new configuration entry')
    } finally {
      setIsAdding(false)
    }
  }

  // Infer editor input component based on value_type
  const renderControlInput = (item: ConfigItem) => {
    const currentVal = draftValues[item.key] ?? item.value ?? ''
    const inferredType = item.value_type || (item.key.includes('date') ? 'datetime' : item.key.includes('enabled') || currentVal === 'true' || currentVal === 'false' ? 'boolean' : 'string')

    if (inferredType === 'boolean') {
      const isTrue = currentVal.toLowerCase() === 'true'
      return (
        <View style={styles.controlGroup}>
          <Pressable
            onPress={() => handleUpdateDraft(item.key, isTrue ? 'false' : 'true')}
            style={[styles.booleanToggleBtn, isTrue ? styles.booleanTrue : styles.booleanFalse]}
          >
            <AppIcon name={isTrue ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={18} color={isTrue ? '#166534' : '#991b1b'} />
            <Text style={[styles.booleanToggleText, { color: isTrue ? '#166534' : '#991b1b' }]}>
              {isTrue ? t('admin.enabled') : t('admin.disabled')}
            </Text>
          </Pressable>
        </View>
      )
    }

    if (inferredType === 'datetime') {
      let formattedPreview = ''
      if (currentVal.trim()) {
        const parsed = new Date(currentVal.trim())
        if (!isNaN(parsed.getTime())) {
          formattedPreview = parsed.toLocaleString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          })
        }
      }

      const localVal = toDatetimeLocal(currentVal)

      return (
        <View style={styles.controlGroup}>
          {Platform.OS === 'web' ? (
            <input
              type="datetime-local"
              value={localVal}
              onChange={(e: any) => {
                const iso = fromDatetimeLocal(e.target.value)
                handleUpdateDraft(item.key, iso)
              }}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '9px 12px',
                fontSize: 14,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                fontFamily: 'inherit',
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
              } as any}
            />
          ) : (
            <TextInput
              value={currentVal}
              onChangeText={(text) => handleUpdateDraft(item.key, text)}
              placeholder="YYYY-MM-DDTHH:mm:ssZ"
              placeholderTextColor="#94a3b8"
              style={styles.textInput}
              autoCapitalize="none"
            />
          )}
          {!!formattedPreview && (
            <Text style={styles.datePreviewText}>{t('admin.localTime', [formattedPreview])}</Text>
          )}
        </View>
      )
    }

    if (inferredType === 'number') {
      return (
        <View style={styles.controlGroup}>
          <TextInput
            value={currentVal}
            onChangeText={(text) => handleUpdateDraft(item.key, text)}
            keyboardType="numeric"
            style={[styles.textInput, { width: 120 }]}
          />
        </View>
      )
    }

    return (
      <View style={styles.controlGroup}>
        <TextInput
          value={currentVal}
          onChangeText={(text) => handleUpdateDraft(item.key, text)}
          style={styles.textInput}
          autoCapitalize="none"
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Primary White Material Container */}
      <View style={styles.cardContainer}>
        {/* Card Header Bar */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.cardTitle}>{t('admin.globalConfigTitle')}</Text>
              {isDirty && (
                <View style={styles.dirtyBadge}>
                  <Text style={styles.dirtyBadgeText}>{t('admin.unsavedChanges')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle}>
              {t('admin.globalConfigSubtitle')}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            {isDirty && (
              <Pressable onPress={handleDiscardChanges} style={styles.discardBtn} disabled={saving}>
                <Text style={styles.discardBtnText}>{t('admin.discard')}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleSaveAll}
              style={[styles.saveAllBtn, !isDirty && styles.saveAllBtnDisabled]}
              disabled={!isDirty || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <AppIcon name="checkmark" size={16} color="#ffffff" />
                  <Text style={styles.saveAllBtnText}>{t('admin.saveAllChanges')}</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => setIsModalOpen(true)} style={styles.addKeyBtn}>
              <AppIcon name="plus.circle.fill" size={16} color="#5a0061" />
              <Text style={styles.addKeyBtnText}>{t('admin.addKey')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Dynamic Config Key List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.loadingText}>{t('admin.loadingConfig')}</Text>
          </View>
        ) : configs.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppIcon name="pencil" size={32} color="#94a3b8" />
            <Text style={styles.emptyTitle}>{t('admin.noConfigKeys')}</Text>
            <Text style={styles.emptySub}>{t('admin.noConfigKeysDesc')}</Text>
          </View>
        ) : (
          <View style={styles.configList}>
            {configs.map((item) => {
              const isItemDirty = (draftValues[item.key] ?? '') !== (item.value ?? '')
              const displayTitle = item.title || item.key
              const displayDesc = item.description || `Database key: ${item.key}`

              return (
                <View key={item.key} style={[styles.configRow, isItemDirty && styles.configRowDirty]}>
                  {/* Left Column: Title, Description, and DB Key */}
                  <View style={styles.metaColumn}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.rowTitle}>{displayTitle}</Text>
                      {item.value_type && (
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>{item.value_type.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowDesc}>{displayDesc}</Text>
                    <Text style={styles.rowKeyCode}>key: {item.key}</Text>
                  </View>

                  {/* Middle Column: Dynamic Control Editor */}
                  <View style={styles.controlColumn}>
                    {renderControlInput(item)}
                  </View>

                  {/* Right Column: Row Delete Action */}
                  <View style={styles.actionColumn}>
                    <Pressable
                      onPress={() => handleDeleteKey(item.key)}
                      style={styles.deleteRowBtn}
                      accessibilityLabel={`Delete ${item.key}`}
                    >
                      <AppIcon name="xmark" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Bottom Save Bar (Visible when dirty) */}
        {isDirty && (
          <View style={styles.bottomSaveBar}>
            <Text style={styles.bottomSaveText}>{t('admin.unsavedChangesBar')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={handleDiscardChanges} style={styles.discardBtn} disabled={saving}>
                <Text style={styles.discardBtnText}>{t('admin.discard')}</Text>
              </Pressable>
              <Pressable onPress={handleSaveAll} style={styles.saveAllBtn} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveAllBtnText}>{t('admin.saveAllChanges')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Add New Key Modal */}
      {isModalOpen && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('admin.addGlobalConfigKey')}</Text>
                <Pressable onPress={() => setIsModalOpen(false)}>
                  <AppIcon name="xmark" size={20} color="#64748b" />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>{t('admin.keyIdentifier')}</Text>
              <TextInput
                value={newKey}
                onChangeText={setNewKey}
                placeholder="e.g. event_start_date"
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>{t('admin.displayTitle')}</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Event Start Date"
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
              />

              <Text style={styles.fieldLabel}>{t('admin.description')}</Text>
              <TextInput
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder="e.g. Controls when hackers gain access to Event Pass QR."
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
              />

              <Text style={styles.fieldLabel}>{t('admin.valueDataType')}</Text>
              <View style={styles.typeSelectorRow}>
                {(['string', 'boolean', 'datetime', 'number'] as const).map((typeOpt) => (
                  <Pressable
                    key={typeOpt}
                    onPress={() => setNewType(typeOpt)}
                    style={[styles.typeChip, newType === typeOpt && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipText, newType === typeOpt && styles.typeChipTextActive]}>
                      {typeOpt.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t('admin.initialValue')}</Text>
              <TextInput
                value={newValue}
                onChangeText={setNewValue}
                placeholder="e.g. 2026-09-05T00:00:00Z or true"
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
                autoCapitalize="none"
              />

              <View style={styles.modalFooter}>
                <Pressable onPress={() => setIsModalOpen(false)} style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelBtnText}>{t('admin.cancel')}</Text>
                </Pressable>
                <Pressable onPress={handleCreateConfig} style={styles.modalSubmitBtn} disabled={isAdding}>
                  {isAdding ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>{t('admin.createSetting')}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.03)' },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  dirtyBadge: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dirtyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  saveAllBtn: {
    backgroundColor: '#5a0061',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveAllBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  saveAllBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  discardBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  discardBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  addKeyBtn: {
    backgroundColor: '#f3e8ff',
    borderColor: '#c084fc',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addKeyBtnText: {
    color: '#5a0061',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  configList: {
    width: '100%',
    gap: 16,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 16,
    flexWrap: 'wrap',
  },
  configRowDirty: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  metaColumn: {
    flex: 2,
    minWidth: 260,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 3,
  },
  rowKeyCode: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#94a3b8',
    marginTop: 6,
  },
  typeBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  controlColumn: {
    flex: 3,
    minWidth: 280,
  },
  controlGroup: {
    width: '100%',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
  },
  datePreviewText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 4,
  },
  booleanToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  booleanTrue: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  booleanFalse: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  booleanToggleText: {
    fontWeight: '800',
    fontSize: 13,
  },
  actionColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deleteRowBtn: {
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  bottomSaveBar: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  bottomSaveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b45309',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    width: '100%',
    maxWidth: 520,
    ...Platform.select({
      web: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  typeChipActive: {
    backgroundColor: '#5a0061',
    borderColor: '#5a0061',
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#5a0061',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
})
