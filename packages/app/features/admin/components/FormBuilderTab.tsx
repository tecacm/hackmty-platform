import * as React from 'react'
import { View, Text, Pressable, ActivityIndicator, ScrollView, TextInput, Modal, Platform, useWindowDimensions, Animated, Easing } from 'react-native'

interface FormField {
  relId: string
  fieldId: string
  displayOrder: number
  sectionId: string
  label: string
  type: string
  required: boolean
  options?: Array<{ label?: any; value?: string }>
}

interface FormBuilderTabProps {
  selectedFormRole: string
  setSelectedFormRole: (role: string) => void
  fetchFormSchema: (role: string) => void
  setShowAddFieldModal: (val: boolean) => void
  formBuilderLoading: boolean
  formFieldsList: FormField[]
  formSectionsList: any[]
  allFormFields: any[]
  handleRemoveFieldFromRole: (relId: string) => void
  handleReorderField: (relId: string, direction: 'up' | 'down') => void
  handleAttachExistingField: (fieldId: string, sectionOverrideId: string | null) => void
  handleEditField: (fieldId: string) => void
  formDraftCount: number
  applyFormDraft: () => void
  discardFormDraft: () => void
  formDraftSaving: boolean
  handleAddSection: (sectionId: string, sectionLabel: Record<string, string>) => void
  rolesList?: any[]
  styles: any
}

// Form labels can be localized strings or composite rich-text definitions.
// The builder is intentionally a static preview, so flatten rich text rather
// than passing a JSON object to React Native's <Text> component.
const previewText = (value: any): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(previewText).filter(Boolean).join('')
  if (typeof value !== 'object') return ''

  if (value.en !== undefined) return previewText(value.en)
  if (value.es !== undefined) return previewText(value.es)
  if (value.content !== undefined) return previewText(value.content)
  if (value.text !== undefined) return previewText(value.text)
  if (value.parts !== undefined) return previewText(value.parts)
  // Link-only composite parts do not have display text in form_fields. Keep a
  // readable marker instead of exposing the underlying object or crashing.
  if (value.linkRef) return 'Link'

  return ''
}

const fmt = (val: any, fallback = '') => previewText(val) || fallback

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  text:         { icon: 'T',  color: '#2563eb', bg: '#eff6ff' },
  textarea:     { icon: '¶',  color: '#7c3aed', bg: '#faf5ff' },
  email:        { icon: '@',  color: '#0891b2', bg: '#ecfeff' },
  tel:          { icon: '☎',  color: '#0891b2', bg: '#ecfeff' },
  number:       { icon: '#',  color: '#0891b2', bg: '#ecfeff' },
  select:       { icon: '▾',  color: '#d97706', bg: '#fffbeb' },
  multiselect:  { icon: '☰',  color: '#d97706', bg: '#fffbeb' },
  checkbox:     { icon: '☑',  color: '#16a34a', bg: '#f0fdf4' },
  radio:        { icon: '◉',  color: '#16a34a', bg: '#f0fdf4' },
  file:         { icon: '↑',  color: '#dc2626', bg: '#fef2f2' },
  date:         { icon: '□',  color: '#5a0061', bg: '#fdf4ff' },
  url:          { icon: '↗',  color: '#5a0061', bg: '#fdf4ff' },
  autocomplete: { icon: '⌕',  color: '#0891b2', bg: '#ecfeff' },
  segmented:    { icon: '▤',  color: '#d97706', bg: '#fffbeb' },
  divider:      { icon: '—',  color: '#94a3b8', bg: '#f8fafc' },
  paragraph:    { icon: '¶',  color: '#64748b', bg: '#f8fafc' },
}
const typeMeta = (t: string) => TYPE_META[(t || 'text').toLowerCase()] || { icon: 'T', color: '#2563eb', bg: '#eff6ff' }

function FieldPreview({ field, isFirst, isLast, onRemove, onUp, onDown, onEdit }: {
  field: FormField; isFirst: boolean; isLast: boolean
  onRemove: () => void; onUp: () => void; onDown: () => void; onEdit: () => void
}) {
  const meta = typeMeta(field.type)
  const label = fmt(field.label, field.fieldId)

  const renderInput = () => {
    const t = (field.type || 'text').toLowerCase()
    const base = { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 11, marginTop: 6 } as any
    const subtitleStr = previewText((field as any).subtitle)
    const optionLabels = (field.options || []).map((option) => fmt(option.label, option.value || 'Option'))

    const inputEl = (() => {
      if (t === 'textarea') return (
        <View style={{ ...base, height: 80, justifyContent: 'flex-start' }}>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Long text response…</Text>
        </View>
      )
      if (t === 'select' || t === 'multiselect') return (
        <View style={{ ...base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>{field.options?.length ? `Choose from ${field.options.length} option${field.options.length === 1 ? '' : 's'}…` : 'Choose an option…'}</Text>
          <Text style={{ color: '#94a3b8' }}>▾</Text>
        </View>
      )
      if (t === 'autocomplete') return (
        <View style={{ ...base, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, color: '#94a3b8' }}>⌕</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Search and select…</Text>
        </View>
      )
      if (t === 'segmented') return (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          {(optionLabels.length ? optionLabels.slice(0, 3) : ['A', 'B', 'C']).map(l => (
            <View key={l} style={{ flex: 1, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, color: '#94a3b8' }}>{l}</Text>
            </View>
          ))}
        </View>
      )
      if (t === 'checkbox') return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <View style={{ width: 18, height: 18, borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 4 }} />
          <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>I agree / confirm</Text>
        </View>
      )
      if (t === 'radio') return (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          {(optionLabels.length ? optionLabels.slice(0, 2) : ['Option A', 'Option B']).map(l => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 16, height: 16, borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 8 }} />
              <Text style={{ fontSize: 13, color: '#94a3b8' }}>{l}</Text>
            </View>
          ))}
        </View>
      )
      if (t === 'file') return (
        <View style={{ ...base, alignItems: 'center', justifyContent: 'center', height: 52 }}>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>↑ Click to upload a file…</Text>
        </View>
      )
      if (t === 'divider') return (
        <View style={{ height: 1, backgroundColor: '#e2e8f0', marginTop: 8 }} />
      )
      if (t === 'paragraph') return (
        <View style={{ ...base, backgroundColor: '#f1f5f9' }}>
          <Text style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Rich text / info block</Text>
        </View>
      )
      return (
        <View style={base}>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
            {t === 'email' ? 'you@example.com' : t === 'url' ? 'https://…' : t === 'tel' ? '+1 (555) 000-0000' : t === 'number' ? '0' : t === 'date' ? 'MM/DD/YYYY' : 'Short text response…'}
          </Text>
        </View>
      )
    })()

    return (
      <View>
        {inputEl}
        {!!subtitleStr && (
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 5, fontStyle: 'italic', lineHeight: 15 }}>{subtitleStr}</Text>
        )}
      </View>
    )
  }

  if ((field.type || '').toLowerCase() === 'divider') {
    return (
      <View style={{ width: '100%', marginVertical: 8 }}>
        <View style={{ height: 1, backgroundColor: '#d1d5db' }} />
        <FieldControls field={field} meta={meta} isFirst={isFirst} isLast={isLast} onRemove={onRemove} onUp={onUp} onDown={onDown} onEdit={onEdit} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#333333', flexShrink: 1 }}>{label}</Text>
        {field.required && <Text style={{ fontSize: 15, color: '#dc2626', fontWeight: '800' }}>*</Text>}
      </View>
      {renderInput()}
      <FieldControls field={field} meta={meta} isFirst={isFirst} isLast={isLast} onRemove={onRemove} onUp={onUp} onDown={onDown} onEdit={onEdit} />
    </View>
  )
}

function FieldControls({ field, meta, isFirst, isLast, onRemove, onUp, onDown, onEdit }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
      <Text style={{ fontSize: 10, color: meta.color, fontWeight: '800' }}>{meta.icon} {(field.type || 'text').toUpperCase()}</Text>
      <Text style={{ fontSize: 10, color: '#94a3b8' }}>#{field.displayOrder}</Text>
      <View style={{ flex: 1 }} />
      <Pressable onPress={onEdit} hitSlop={6}><Text style={{ color: '#5a0061', fontSize: 11, fontWeight: '800' }}>Edit</Text></Pressable>
      <Pressable onPress={onUp} disabled={isFirst} hitSlop={6}><Text style={{ color: isFirst ? '#cbd5e1' : '#5a0061', fontWeight: '800' }}>↑</Text></Pressable>
      <Pressable onPress={onDown} disabled={isLast} hitSlop={6}><Text style={{ color: isLast ? '#cbd5e1' : '#5a0061', fontWeight: '800' }}>↓</Text></Pressable>
      <Pressable onPress={onRemove} hitSlop={6}><Text style={{ color: '#dc2626', fontWeight: '800' }}>×</Text></Pressable>
    </View>
  )
}

function AddFromRegistryModal({ visible, onClose, allFormFields, formSectionsList, formFieldsList, onAttach }: {
  visible: boolean; onClose: () => void
  allFormFields: any[]; formSectionsList: any[]; formFieldsList: FormField[]
  onAttach: (fieldId: string, sectionOverride: string | null) => void
}) {
  const [search, setSearch] = React.useState('')
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null)
  const [sectionOverride, setSectionOverride] = React.useState('')
  const sheetTranslateY = React.useRef(new Animated.Value(700)).current
  React.useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(700)
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    }
  }, [visible, sheetTranslateY])
  const alreadyAttached = new Set(formFieldsList.map(f => f.fieldId))
  const filtered = allFormFields.filter(f => {
    const label = String(fmt(f.label, f.id))
    return label.toLowerCase().includes(search.toLowerCase()) || String(f.id).toLowerCase().includes(search.toLowerCase())
  })
  const doAttach = () => {
    if (!selectedFieldId) return
    onAttach(selectedFieldId, sectionOverride.trim() || null)
    setSelectedFieldId(null); setSectionOverride(''); setSearch(''); onClose()
  }
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' }}>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }], backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', padding: 24, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#22002c' }}>Field Registry</Text>
              <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Pick an existing field to attach to this role&apos;s form</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 6 }}><Text style={{ fontSize: 18, fontWeight: '800', color: '#999' }}>✕</Text></Pressable>
          </View>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search fields…" placeholderTextColor="#aaa"
            style={{ borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#22002c' }} />
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 6 }}>
              {filtered.map(f => {
                const label = String(fmt(f.label, f.id))
                const meta = typeMeta(f.field_type)  // raw DB rows use field_type
                const isAttached = alreadyAttached.has(f.id)
                const isSelected = selectedFieldId === f.id
                return (
                  <Pressable key={f.id} onPress={() => !isAttached && setSelectedFieldId(isSelected ? null : f.id)}
                    style={({ pressed }) => ({ borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: isSelected ? '#5a0061' : isAttached ? '#e2e8f0' : '#f1f5f9', backgroundColor: isSelected ? 'rgba(90,0,97,0.06)' : isAttached ? '#fafafa' : pressed ? '#f8fafc' : '#fff', flexDirection: 'row', alignItems: 'center', gap: 10 })}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: meta.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14, color: meta.color }}>{meta.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isAttached ? '#aaa' : '#22002c' }}>{label}</Text>
                      <Text style={{ fontSize: 11, color: '#999' }}>id:{f.id} · {(f.field_type || 'text').toUpperCase()}{f.is_required ? ' · REQUIRED' : ''}</Text>
                    </View>
                    {isAttached && <View style={{ backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '800' }}>ATTACHED</Text></View>}
                    {isSelected && <Text style={{ fontSize: 16, color: '#5a0061', fontWeight: '800' }}>✓</Text>}
                  </Pressable>
                )
              })}
              {filtered.length === 0 && <Text style={{ textAlign: 'center', color: '#aaa', fontStyle: 'italic', paddingVertical: 20 }}>No fields found</Text>}
            </View>
          </ScrollView>
          {selectedFieldId && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.4 }}>SECTION OVERRIDE (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => setSectionOverride('')} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: !sectionOverride ? '#5a0061' : '#e2e8f0', backgroundColor: !sectionOverride ? 'rgba(90,0,97,0.08)' : pressed ? '#f8fafc' : '#fff' })}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: !sectionOverride ? '#5a0061' : '#666' }}>Default</Text>
                  </Pressable>
                  {formSectionsList.map((s: any) => (
                    <Pressable key={s.id} onPress={() => setSectionOverride(sectionOverride === s.id ? '' : s.id)}
                      style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: sectionOverride === s.id ? '#5a0061' : '#e2e8f0', backgroundColor: sectionOverride === s.id ? 'rgba(90,0,97,0.08)' : pressed ? '#f8fafc' : '#fff' })}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: sectionOverride === s.id ? '#5a0061' : '#666' }}>{fmt(s.label, s.id)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={onClose} style={({ pressed }) => ({ flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.2)', backgroundColor: pressed ? '#f5f5f5' : 'transparent', alignItems: 'center', justifyContent: 'center' })}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#666' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={doAttach} disabled={!selectedFieldId} style={({ pressed }) => ({ flex: 2, height: 44, borderRadius: 12, backgroundColor: !selectedFieldId ? '#e2e8f0' : pressed ? '#3d0042' : '#5a0061', alignItems: 'center', justifyContent: 'center' })}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: !selectedFieldId ? '#aaa' : '#fff' }}>
                Attach Field{sectionOverride ? ` → ${sectionOverride}` : ''}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

export function FormBuilderTab({
  selectedFormRole, setSelectedFormRole, fetchFormSchema, setShowAddFieldModal,
  formBuilderLoading, formFieldsList, formSectionsList, allFormFields,
  handleRemoveFieldFromRole, handleReorderField, handleAttachExistingField, handleEditField,
  formDraftCount, applyFormDraft, discardFormDraft, formDraftSaving,
  handleAddSection, rolesList = [], styles,
}: FormBuilderTabProps) {
  const { width } = useWindowDimensions()
  const isWide = width >= 700
  const isSmallScreen = width > 0 && width < 768
  const [showRoleDropdown, setShowRoleDropdown] = React.useState(false)
  const [showRegistryModal, setShowRegistryModal] = React.useState(false)
  const [showAddSectionModal, setShowAddSectionModal] = React.useState(false)
  const [newSectionId, setNewSectionId] = React.useState('')
  const [newSectionTranslations, setNewSectionTranslations] = React.useState([{ key: 'en', value: '' }])

  const defaultRoles = [
    { id: 'hacker', label: 'Hacker' }, { id: 'volunteer', label: 'Volunteer' },
    { id: 'mentor', label: 'Mentor' }, { id: 'judge', label: 'Judge' }, { id: 'sponsor', label: 'Sponsor' },
  ]
  const safeRole = selectedFormRole || 'hacker'
  // Keep the known roles while also including every role fetched from Supabase.
  // A partial RLS response must not collapse this selector to a single role.
  const availableRoles = Array.from(new Map([
    ...defaultRoles,
    ...rolesList.map(r => ({ id: r.id || 'role', label: fmt(r.label, (r.id || 'ROLE').toUpperCase()) })),
  ].map((role) => [role.id.toLowerCase(), role])).values())
  const currentRoleLabel = availableRoles.find(r => r.id.toLowerCase() === safeRole.toLowerCase())?.label || safeRole

  const sectionMap = React.useMemo(() => {
    const map: Record<string, FormField[]> = {}
    ;[...formFieldsList].sort((a, b) => a.displayOrder - b.displayOrder).forEach(f => {
      const key = f.sectionId || 'general'
      if (!map[key]) map[key] = []
      map[key]!.push(f)
    })
    return map
  }, [formFieldsList])

  const allSectionIds = Array.from(new Set([
    ...formSectionsList.map((s: any) => s.id),
    ...Object.keys(sectionMap),
  ]))
  const orderedFieldIds = [...formFieldsList]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((field) => field.relId)

  const buildRows = (fields: FormField[]) => {
    const rows: FormField[][] = []
    let pending: FormField[] = []
    const flush = () => {
      if (pending.length) rows.push(pending)
      pending = []
    }
    fields.forEach((field) => {
      const type = (field.type || '').toLowerCase()
      if (type === 'divider' || type === 'paragraph' || type === 'checkbox') {
        flush()
        rows.push([field])
      } else {
        pending.push(field)
        if (pending.length === 2) flush()
      }
    })
    flush()
    return rows
  }

  return (
    <View style={{ width: '100%', gap: 18 }}>
      {/* Header toolbar */}
      <View style={{ position: 'relative', zIndex: 50, elevation: 50, backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', flexDirection: isSmallScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: isSmallScreen ? 'stretch' : 'center', gap: 14 }}>
        <View style={{ flex: isSmallScreen ? undefined : 1, width: isSmallScreen ? '100%' : 'auto' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#22002c', letterSpacing: -0.3 }}>Form Builder</Text>
          <Text style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            Editing <Text style={{ fontWeight: '800', color: '#5a0061' }}>{currentRoleLabel.toUpperCase()}</Text>
            {' · '}{formFieldsList.length} field{formFieldsList.length !== 1 ? 's' : ''}{allSectionIds.length > 0 ? ` · ${allSectionIds.length} section${allSectionIds.length !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: isSmallScreen ? '100%' : 'auto' }}>
          <View style={{ position: 'relative', zIndex: 100, elevation: 100 }}>
            <Pressable onPress={() => setShowRoleDropdown(!showRoleDropdown)}
              style={({ pressed }) => ({ height: 38, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.3)', backgroundColor: pressed ? 'rgba(90,0,97,0.06)' : '#fff' })}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#5a0061' }}>{currentRoleLabel} ▾</Text>
            </Pressable>
            {showRoleDropdown && (
              <View style={{ position: 'absolute', top: 42, right: 0, zIndex: 9999, elevation: 9999, minWidth: 200, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 12px 30px rgba(15,23,42,0.18)' } as any }) }}>
                {availableRoles.map((role) => {
                  const isSelected = role.id.toLowerCase() === safeRole.toLowerCase()
                  return <Pressable key={role.id} onPress={() => { setSelectedFormRole(role.id); fetchFormSchema(role.id); setShowRoleDropdown(false) }} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: isSelected ? 'rgba(90,0,97,0.07)' : pressed ? '#f8fafc' : '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' })}><Text style={{ fontSize: 13, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#5a0061' : '#334155' }}>{isSelected ? '✓ ' : ''}{role.label}</Text></Pressable>
                })}
              </View>
            )}
          </View>
          <Pressable onPress={() => setShowRegistryModal(true)}
            style={({ pressed }) => ({ height: 38, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.3)', backgroundColor: pressed ? 'rgba(90,0,97,0.06)' : '#fff', flexDirection: 'row', alignItems: 'center' })}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#5a0061' }}>Add Existing</Text>
          </Pressable>
          <Pressable onPress={() => setShowAddSectionModal(true)}
            style={({ pressed }) => ({ height: 38, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.3)', backgroundColor: pressed ? 'rgba(90,0,97,0.06)' : '#fff', justifyContent: 'center' })}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#5a0061' }}>+ Section</Text>
          </Pressable>
          <Pressable onPress={() => setShowAddFieldModal(true)}
            style={({ pressed }) => ({ height: 38, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', flexDirection: 'row', alignItems: 'center' })}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>+ New Field</Text>
          </Pressable>
          {formDraftCount > 0 && <>
            <Pressable onPress={discardFormDraft} disabled={formDraftSaving} style={{ height: 38, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#dc2626', justifyContent: 'center' }}><Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '800' }}>Discard</Text></Pressable>
            <Pressable onPress={applyFormDraft} disabled={formDraftSaving} style={{ height: 38, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#16a34a', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{formDraftSaving ? 'Applying…' : `Apply ${formDraftCount} change${formDraftCount === 1 ? '' : 's'}`}</Text></Pressable>
          </>}
        </View>
      </View>

      {formBuilderLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c2b75f" />
          <Text style={styles.loadingText}>Loading form…</Text>
        </View>
      ) : formFieldsList.length === 0 ? (
        <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 40, borderWidth: 1, borderColor: 'rgba(90,0,97,0.12)', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#22002c' }}>No fields yet</Text>
          <Text style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>Add existing fields from the registry or create new ones.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Pressable onPress={() => setShowRegistryModal(true)} style={({ pressed }) => ({ height: 38, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.3)', backgroundColor: pressed ? 'rgba(90,0,97,0.06)' : '#fff', justifyContent: 'center' })}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#5a0061' }}>Add from Registry</Text>
            </Pressable>
            <Pressable onPress={() => setShowAddFieldModal(true)} style={({ pressed }) => ({ height: 38, paddingHorizontal: 16, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', justifyContent: 'center' })}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>+ Create New</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ backgroundColor: '#f4f4f4', borderRadius: 24, padding: isWide ? 40 : 20, gap: 24 }}>
          {allSectionIds.map(sectionId => {
            const sectionDef = formSectionsList.find((s: any) => s.id === sectionId)
            const sectionLabel = sectionDef ? fmt(sectionDef.label, sectionId) : sectionId
            const fields = (sectionMap[sectionId] || []).sort((a, b) => a.displayOrder - b.displayOrder)
            if (fields.length === 0) return null
            return (
              <View key={sectionId} style={{ gap: 12 }}>
                <Text style={{ fontSize: 25, fontWeight: '600', color: '#5a0061' }}>{sectionLabel}</Text>
                {buildRows(fields).map((row, rowIndex) => (
                  <View key={`${sectionId}-${rowIndex}`} style={{ flexDirection: isWide && row.length > 1 ? 'row' : 'column', gap: isWide && row.length > 1 ? 30 : 12, width: '100%' }}>
                    {row.map((field) => {
                      const globalIndex = orderedFieldIds.indexOf(field.relId)
                      return <FieldPreview key={field.relId} field={field} isFirst={globalIndex === 0} isLast={globalIndex === orderedFieldIds.length - 1}
                        onRemove={() => handleRemoveFieldFromRole(field.relId)}
                        onUp={() => handleReorderField(field.relId, 'up')}
                        onDown={() => handleReorderField(field.relId, 'down')}
                        onEdit={() => handleEditField(field.fieldId)}
                      />
                    })}
                  </View>
                ))}
              </View>
            )
          })}
        </View>
      )}

      <AddFromRegistryModal visible={showRegistryModal} onClose={() => setShowRegistryModal(false)}
        allFormFields={allFormFields} formSectionsList={formSectionsList} formFieldsList={formFieldsList} onAttach={handleAttachExistingField} />

      <Modal visible={showAddSectionModal} transparent animationType="fade" onRequestClose={() => setShowAddSectionModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420, gap: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#22002c' }}>Register Section</Text>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.4 }}>SECTION ID (slug)</Text>
              <TextInput value={newSectionId} onChangeText={setNewSectionId} placeholder="e.g. experience, links" placeholderTextColor="#aaa" autoCapitalize="none"
                style={{ borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#22002c' }} />
            </View>
            <View style={{ gap: 7 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.4 }}>DISPLAY LABEL TRANSLATIONS</Text>
              {newSectionTranslations.map((translation, index) => (
                <View key={index} style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={translation.key} onChangeText={(value) => setNewSectionTranslations(newSectionTranslations.map((item, i) => i === index ? { ...item, key: value } : item))} placeholder="key" placeholderTextColor="#aaa" autoCapitalize="none" style={{ width: 74, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: '#22002c' }} />
                  <TextInput value={translation.value} onChangeText={(value) => setNewSectionTranslations(newSectionTranslations.map((item, i) => i === index ? { ...item, value } : item))} placeholder="e.g. Work Experience" placeholderTextColor="#aaa" style={{ flex: 1, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#22002c' }} />
                  {newSectionTranslations.length > 1 && <Pressable onPress={() => setNewSectionTranslations(newSectionTranslations.filter((_, i) => i !== index))} style={{ justifyContent: 'center' }}><Text style={{ color: '#dc2626', fontSize: 18, fontWeight: '800' }}>×</Text></Pressable>}
                </View>
              ))}
              <Pressable onPress={() => setNewSectionTranslations([...newSectionTranslations, { key: '', value: '' }])}><Text style={{ color: '#5a0061', fontSize: 12, fontWeight: '800' }}>+ Add translation</Text></Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => { setShowAddSectionModal(false); setNewSectionId(''); setNewSectionTranslations([{ key: 'en', value: '' }]) }}
                style={({ pressed }) => ({ flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(90,0,97,0.2)', backgroundColor: pressed ? '#f5f5f5' : 'transparent', alignItems: 'center', justifyContent: 'center' })}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#666' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { if (!newSectionId.trim()) return; const label = Object.fromEntries(newSectionTranslations.filter((translation) => translation.key.trim() && translation.value.trim()).map((translation) => [translation.key.trim(), translation.value.trim()])); handleAddSection(newSectionId.trim(), Object.keys(label).length ? label : { en: newSectionId.trim() }); setShowAddSectionModal(false); setNewSectionId(''); setNewSectionTranslations([{ key: 'en', value: '' }]) }}
                style={({ pressed }) => ({ flex: 2, height: 42, borderRadius: 10, backgroundColor: pressed ? '#3d0042' : '#5a0061', alignItems: 'center', justifyContent: 'center' })}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>Add Section</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
