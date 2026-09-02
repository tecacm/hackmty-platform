import { useState, useEffect, useRef, ReactNode, createElement } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Platform, Linking, Pressable } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { TextLink } from 'solito/link'
import { StyledInput } from 'app/components/styled-input'
import { StyledSelect } from 'app/components/styled-select'
import { StyledAutocomplete } from 'app/components/styled-autocomplete'
import { StyledSegmented } from 'app/components/styled-segmented'
import { StyledFileInput } from 'app/components/styled-file-input'
import { FormCheckbox } from 'app/components/form-checkbox'
import FormRadio from 'app/components/form-radio'
import { PillButton } from 'app/components/pill-button'
import { getApplicantFieldsForRole, getApplicantRoleLabel, type ApplicantField } from './applicant-field-config'
import { ApplicantRole, ApplicantFormData } from './applicant-types'
import { formFieldColors, formFieldStyles } from 'app/components/form-field-styles'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { ConfettiOverlay } from 'app/components/confetti-overlay'
import { useTranslation } from 'app/i18n'

type ApplicantFormProps = {
  role: ApplicantRole
  fields?: ApplicantField[]
  initialValues?: Partial<ApplicantFormData>
  disabledFields?: string[]
  status?: string | null
  adminFeedback?: string | null
  feedbackHistory?: any[]
  onSubmit: (data: ApplicantFormData) => void
  onSaveDraft?: (data: ApplicantFormData) => void
  onConfirmAttendance?: () => Promise<void>
  systemLinks?: Record<string, { text: any; href: string }>
  textBlocks?: Record<string, string>
  isClosed?: boolean
  confirmClosed?: boolean
  confirmCloseAt?: string | null
  inviteOverride?: boolean
  inviteExpiresAt?: string | null
}

type SectionRow<T> =
  | { type: 'divider'; field: T }
  | { type: 'fields'; fields: T[] }

function getDefaultValueForField(field: { fieldType?: string; multiple?: boolean }) {
  if (field.fieldType === 'checkbox') return false
  if (field.multiple) return []
  return ''
}

function FormDivider() {
  return <View style={styles.divider} />
}

type SectionHeader = { key: string; text: string }

function getSectionHeaders(sectionId: string, textBlocks: Record<string, string> = {}): SectionHeader[] {
  const sectionHeaderMap: Record<string, { key: string; blockId: string }[]> = {
    PERSONAL_INFO: [{ key: 'personalInfoIntro', blockId: 'personalInfoIntro' }],
    SHOW_BUILT: [{ key: 'hackathonsHeader', blockId: 'hackathonsHeader' }],
  }

  const items = sectionHeaderMap[sectionId] || []
  return items
    .map(({ key, blockId }) => ({ key, text: textBlocks[blockId] || '' }))
    .filter(h => !!h.text)
}

function buildSectionRows<T extends { fieldType?: string }>(fields: T[]): SectionRow<T>[] {
  const rows: SectionRow<T>[] = []
  let pendingFields: T[] = []

  fields.forEach((field) => {
    if (field.fieldType === 'divider' || field.fieldType === 'paragraph') {
      if (pendingFields.length) {
        rows.push({ type: 'fields', fields: pendingFields })
        pendingFields = []
      }

      rows.push({ type: 'divider', field })
      return
    }

    // Checkboxes always get their own row
    if (field.fieldType === 'checkbox') {
      if (pendingFields.length) {
        rows.push({ type: 'fields', fields: pendingFields })
        pendingFields = []
      }
      rows.push({ type: 'fields', fields: [field] })
      return
    }

    pendingFields.push(field)

    if (pendingFields.length === 2) {
      rows.push({ type: 'fields', fields: pendingFields })
      pendingFields = []
    }
  })

  if (pendingFields.length) {
    rows.push({ type: 'fields', fields: pendingFields })
  }

  return rows
}

// Helper to create React component for hyperlinked labels
const createMLHLink = (text: string, href: string) =>
  createElement(
    TextLink,
    { href, style: { color: '#c2b75f', textDecorationLine: 'underline' }, children: text }
  )

// Helper function to build React components from composite label definitions
const buildCompositeLabel = (labelDef: any, systemLinks: Record<string, { text: any; href: string }> = {}, baseStyle?: any, locale: string = 'en'): ReactNode => {
  if (!labelDef) return ''
  if (typeof labelDef === 'string') return labelDef
  if (typeof labelDef === 'object' && labelDef !== null) {
    if (labelDef[locale]) {
      if (typeof labelDef[locale] === 'string') return labelDef[locale]
      labelDef = labelDef[locale]
    } else if (labelDef.en) {
      if (typeof labelDef.en === 'string') return labelDef.en
      labelDef = labelDef.en
    }
  }
  if (!labelDef || !labelDef.parts) {
    return typeof labelDef === 'string' ? labelDef : ''
  }
  
  const parts = labelDef.parts.map((part: any) => {
    if (part.type === 'text') return part.content
    if (part.type === 'space') return ' '
    if (part.type === 'link') {
      let href = part.href
      let linkText = part.text
      if (part.linkRef) {
        const linkDef = systemLinks[part.linkRef]
        if (linkDef) {
          href = href || linkDef.href
          linkText = linkText || (typeof linkDef.text === 'object' ? (linkDef.text[locale] || linkDef.text.en || linkDef.text) : linkDef.text)
        }
      }
      if (!href) return linkText || part.linkRef || ''
      return createMLHLink(linkText || href, href)
    }
    return null
  }).filter(Boolean)
  
  return createElement(
    Text,
    { style: baseStyle },
    ...parts
  )
}

export function ApplicantForm({
  role,
  fields: propFields,
  initialValues = {},
  disabledFields = [],
  status = null,
  adminFeedback = null,
  feedbackHistory = [],
  onSubmit,
  onSaveDraft,
  onConfirmAttendance,
  systemLinks = {},
  textBlocks = {},
  isClosed = false,
  confirmClosed = false,
  confirmCloseAt = null,
  inviteOverride = false,
  inviteExpiresAt = null
}: ApplicantFormProps) {
  const { t, locale } = useTranslation()
  const { hasPermission } = useUserPermissions()
  const allFields = propFields || getApplicantFieldsForRole(role)
  const { width } = useWindowDimensions()
  const [isReady, setIsReady] = useState(false)
  const isWide = width >= 520
  // Live countdown to the invite code's expiry (special-invite / substitute links).
  const [nowTs, setNowTs] = useState(Date.now())
  useEffect(() => {
    if (!inviteOverride || !inviteExpiresAt) return
    const id = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [inviteOverride, inviteExpiresAt])
  const inviteMsLeft = inviteOverride && inviteExpiresAt ? new Date(inviteExpiresAt).getTime() - nowTs : null
  const fmtLeft = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }
  // A valid invite reopens a REJECTED application so the holder can re-apply (e.g. a substitute
  // who was previously rejected). Accepted/confirmed/submitted stay locked.
  const inviteReopen = inviteOverride && status === 'rejected'
  const isFormLocked =
    isClosed ||
    (status !== null && status !== 'draft' && status !== 'changes_requested' && !inviteReopen)

  const [isConfirming, setIsConfirming] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const handleConfirmAttendance = async () => {
    if (!onConfirmAttendance) return
    try {
      setIsConfirming(true)
      await onConfirmAttendance()
    } catch (err: any) {
      alert(err.message || 'Failed to confirm attendance.')
    } finally {
      setIsConfirming(false)
    }
  }

  const dynamicHeadingSize = Math.round(Math.min(50, Math.max(24, width * 0.07)))

  const defaultValues = allFields.reduce<Record<string, unknown>>((accumulator, field: any) => {
    accumulator[field.name] = getDefaultValueForField(field)
    return accumulator
  }, {})

  useEffect(() => {
    setIsReady(true)
  }, [])

  type SectionRef = string | { id: string; label?: string; order?: number }

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const { control, handleSubmit, watch, reset, formState: { errors, isDirty } } = useForm<Partial<ApplicantFormData>>({
    defaultValues: {
      ...defaultValues,
      ...(initialValues as object),
    } as Partial<ApplicantFormData>,
  })

  const currentValues = watch()
  const isInitialized = useRef(false)

  // Reset initialization flag when role changes
  useEffect(() => {
    isInitialized.current = false
  }, [role])

  // Populate form with initial values when they are loaded and ready (only once per mount/role change)
  useEffect(() => {
    if (isReady && initialValues && Object.keys(initialValues).length > 0 && !isInitialized.current) {
      reset({
        ...defaultValues,
        ...(initialValues as object),
      } as Partial<ApplicantFormData>)
      isInitialized.current = true
    }
  }, [initialValues, isReady, reset, defaultValues])

  // Auto-save draft on change when form is dirty
  useEffect(() => {
    if (!onSaveDraft || !isReady || !isDirty || isFormLocked) return

    setSaveStatus('saving')
    const handler = setTimeout(async () => {
      try {
        await onSaveDraft(currentValues as ApplicantFormData)
        // Reset defaultValues to currentValues to clear isDirty flag, but keep active user inputs intact
        reset(currentValues, { keepValues: true })
        setSaveStatus('saved')
      } catch (err) {
        console.error('Failed to auto-save draft:', err)
        setSaveStatus('idle')
      }
    }, 1500)

    return () => {
      clearTimeout(handler)
    }
  }, [currentValues, onSaveDraft, isReady, isDirty, reset])

  const roleFieldNames = new Set(allFields.map((f: any) => f?.name).filter(Boolean))

  const fields = allFields.filter((field) => {
    const dependsOn = 'dependsOn' in field ? field.dependsOn : undefined
    if (!dependsOn) return true
    if (!roleFieldNames.has(dependsOn.field)) return true
    const dependentValue = (currentValues as Record<string, unknown>)[dependsOn.field]
    if (dependentValue === undefined || dependentValue === null || dependentValue === '') return false

    const op = dependsOn.operator || '=='
    const targetVal = dependsOn.value

    if (op === '<') return Number(dependentValue) < Number(targetVal)
    if (op === '<=') return Number(dependentValue) <= Number(targetVal)
    if (op === '>') return Number(dependentValue) > Number(targetVal)
    if (op === '>=') return Number(dependentValue) >= Number(targetVal)
    if (op === '!=' || op === '!==') return String(dependentValue) !== String(targetVal)
    return String(dependentValue) === String(targetVal)
  })

  const sectionMap = new Map<string, { key: string; id: string; label: string; order: number; fields: typeof fields }>()

  fields.forEach((field) => {
    const sec = (field as any).section as SectionRef | undefined
    const id = typeof sec === 'string' || !sec ? (sec ?? 'General') : (sec as any).id ?? 'General'
    const key = (field as any).sectionKey ?? (typeof sec === 'string' ? sec : undefined) ?? id
    const rawLabel = typeof sec === 'object' && (sec as any).label ? (sec as any).label : id
    const label = typeof rawLabel === 'object' && rawLabel !== null
      ? (rawLabel[locale] || rawLabel.en || String(rawLabel))
      : String(rawLabel ?? '')
    const order = typeof sec === 'object' && typeof (sec as any).order === 'number' ? (sec as any).order : 0

    if (!sectionMap.has(key)) sectionMap.set(key, { key, id, label, order, fields: [] as typeof fields })
    sectionMap.get(key)!.fields.push(field)
  })

  const sections = Array.from(sectionMap.values()).sort((a, b) => a.order - b.order)

  const fieldRefs = useRef<Record<string, any>>({})
  const missingErrorCount = Object.keys(errors).length

  const scrollToFirstError = (formErrors: Record<string, any>) => {
    const firstErrorField = fields.find((f: any) => f?.name && formErrors[f.name])
    if (firstErrorField && firstErrorField.name && fieldRefs.current[firstErrorField.name]) {
      const node = fieldRefs.current[firstErrorField.name]
      if (Platform.OS === 'web' && node?.scrollIntoView) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  // Avoid hydration mismatch by waiting for client width calculation
  if (!isReady) {
    return <View style={styles.container} />
  }

  return (
    <View style={styles.container}>
      {isClosed && (
        <View style={{ backgroundColor: '#fee2e2', borderColor: '#f87171', borderWidth: 1, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
          <Text style={{ color: '#991b1b', fontWeight: '600', fontSize: 16, textAlign: 'center' }}>
            {t('applicant.registrationClosed')}
          </Text>
        </View>
      )}

      {inviteMsLeft != null && (
        <View style={{ backgroundColor: inviteMsLeft > 0 ? '#fffbeb' : '#fef2f2', borderColor: inviteMsLeft > 0 ? '#f59e0b' : '#ef4444', borderWidth: 1, borderRadius: 12, padding: 12, width: '100%', marginBottom: 16 }}>
          <Text style={{ color: inviteMsLeft > 0 ? '#b45309' : '#b91c1c', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
            {inviteMsLeft > 0 ? t('applicant.inviteCountdown', { time: fmtLeft(inviteMsLeft) }) : t('applicant.inviteExpired')}
          </Text>
        </View>
      )}

      {status === 'changes_requested' && (
        <View style={{ backgroundColor: '#fffbeb', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
          <Text style={{ color: '#b45309', fontWeight: '700', fontSize: 16, marginBottom: 4 }}>
            {t('applicant.changesRequestedTitle')}
          </Text>
          <Text style={{ color: '#78350f', fontSize: 14 }}>
            {adminFeedback || t('applicant.changesRequestedDesc')}
          </Text>
        </View>
      )}

      {status === 'submitted' && !isClosed && (
        <View style={{ backgroundColor: '#ecfdf5', borderColor: '#10b981', borderWidth: 1, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
          <Text style={{ color: '#047857', fontWeight: '600', fontSize: 16, textAlign: 'center' }}>
            {t('applicant.applicationSubmittedLocked')}
          </Text>
        </View>
      )}

      {status === 'accepted' && (
        confirmClosed ? (
          <View style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 20, width: '100%', marginBottom: 20, gap: 8 }}>
            <Text style={{ color: '#b91c1c', fontWeight: '800', fontSize: 16, textAlign: 'center' }}>
              {t('applicant.confirmClosedTitle')}
            </Text>
            <Text style={{ color: '#991b1b', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
              {confirmCloseAt
                ? t('applicant.confirmClosedWithDate', {
                    date: new Date(confirmCloseAt).toLocaleString(locale, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  })
                : t('applicant.confirmClosed')}
            </Text>
          </View>
        ) : (
          <>
            {confirmCloseAt ? (
              <View style={{ alignSelf: 'center', marginBottom: 12, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#f0fdf4', borderColor: '#86efac' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803d' }}>
                  {t('applicant.attendanceClosesOn', {
                    date: new Date(confirmCloseAt).toLocaleString(locale, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  })}
                </Text>
              </View>
            ) : null}
            <View style={{ backgroundColor: '#f0fdf4', borderColor: '#22c55e', borderWidth: 1, borderRadius: 12, padding: 20, width: '100%', marginBottom: 20, gap: 12 }}>
              <Text style={{ color: '#15803d', fontWeight: '700', fontSize: 18, textAlign: 'center' }}>
                {t('applicant.congratulations')}
              </Text>
              <Text style={{ color: '#166534', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                {t('applicant.acceptedNotice')}
              </Text>
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <PillButton
                  title={t('applicant.confirmAttendance')}
                  variant="secondary"
                  isLoading={isConfirming}
                  onPress={handleConfirmAttendance}
                  additionalStyle={{ width: 220, height: 48 }}
                />
              </View>
            </View>
          </>
        )
      )}

      {status === 'confirmed' && (
        <View style={{ backgroundColor: '#f0fdf4', borderColor: '#22c55e', borderWidth: 1, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
          <Text style={{ color: '#15803d', fontWeight: '700', fontSize: 18, textAlign: 'center', marginBottom: 4 }}>
            {t('applicant.attendanceConfirmed')}
          </Text>
          <Text style={{ color: '#166534', fontSize: 14, textAlign: 'center' }}>
            {t('applicant.attendanceConfirmedNotice')}
          </Text>
        </View>
      )}

      {/* Historical Changes Requests Log for Applicant */}
      {feedbackHistory.length > 0 && (
        <View style={{ backgroundColor: '#ffffff', borderColor: 'rgba(90, 0, 97, 0.12)', borderWidth: 1.5, borderRadius: 16, padding: 20, width: '100%', marginBottom: 20, gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#22002c' }}>
            {t('applicant.changesRequestHistory')}
          </Text>
          {feedbackHistory.map((item: any, idx: number) => {
            const reqDate = item.requested_at ? new Date(item.requested_at).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US') : t('applicant.unknownDate')
            const resDate = item.resolved_at ? new Date(item.resolved_at).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US') : t('applicant.pendingResolution')
            return (
              <View key={idx} style={[{ paddingVertical: 8, gap: 4 }, idx > 0 && { borderTopWidth: 1, borderColor: 'rgba(34, 0, 44, 0.08)' }]}>
                <Text style={{ fontSize: 14, color: '#555555', fontStyle: 'italic' }}>
                  "{item.feedback}"
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#888888' }}>{t('applicant.requested')}: {reqDate}</Text>
                  <Text style={[{ fontSize: 11, color: '#888888' }, !item.resolved_at && { color: '#d32f2f', fontWeight: '700' }]}>
                    {t('applicant.resolved')}: {resDate}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {status === 'rejected' && !inviteReopen && (
        <View style={{ backgroundColor: '#fef2f2', borderColor: '#ef4444', borderWidth: 1, borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 }}>
          <Text style={{ color: '#b91c1c', fontWeight: '600', fontSize: 16, textAlign: 'center' }}>
            {t('applicant.rejectedNotice')}
          </Text>
        </View>
      )}

      {Platform.OS === 'web' && (
        <Text style={[styles.heading, { fontSize: dynamicHeadingSize }, styles.shadow]}> 
          {t('applicant.applyingAs', { role: getApplicantRoleLabel(role, locale) })}
        </Text>
      )}

      <View style={{ width: '100%', gap: 16, opacity: isFormLocked ? 0.75 : 1 }} pointerEvents={isFormLocked ? "none" : "auto"}>
        {sections.map(({ key: sectionKey, id: sectionName, label: sectionLabel, fields: sectionFields }) => (
          <View key={sectionKey} style={styles.section}>
            {sectionName !== 'General' && <Text style={styles.sectionTitle}>{sectionLabel ?? sectionName}</Text>}

            {getSectionHeaders(sectionKey, textBlocks).map((header) => (
              <View key={`${sectionKey}-${header.key}`} style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderText}>{header.text}</Text>
              </View>
            ))}

            {buildSectionRows(sectionFields).map((row, rowIndex) => {
              if (row.type === 'divider') {
                const f: any = row.field
                if (f.fieldType === 'paragraph') {
                  const rawContent = f.content || f.label
                  const resolved = typeof rawContent === 'object' && rawContent !== null && !rawContent.type && !rawContent.parts
                    ? (rawContent[locale] || rawContent['en'] || rawContent)
                    : rawContent

                  const contentNode = typeof resolved === 'object' && resolved !== null
                    ? buildCompositeLabel(resolved, systemLinks, styles.paragraphText)
                    : resolved

                  return (
                    <View key={`${sectionKey}-${rowIndex}-paragraph`} style={styles.paragraphRow}>
                      {typeof contentNode === 'string' ? (
                        <Text style={styles.paragraphText}>{contentNode}</Text>
                      ) : (
                        contentNode
                      )}
                    </View>
                  )
                }

                return (
                  <View key={`${sectionKey}-${(row as any).field.name ?? rowIndex}-${rowIndex}`} style={styles.dividerRow}>
                    <FormDivider />
                  </View>
                )
              }

              return (
                <View key={`${sectionKey}-${rowIndex}`} style={[styles.row, isWide ? styles.rowWide : styles.rowNarrow]}>
                  {row.fields.map((field) => {
                    // skip non-input rows (shouldn't be present here, but guard for types)
                    if ((field as any).fieldType === 'divider' || (field as any).fieldType === 'paragraph') return null

                    const ff: any = field
                    const resolvedLabel = typeof ff.label === 'object' && ff.label !== null
                      ? buildCompositeLabel(ff.label, systemLinks, { color: formFieldColors.titleText }, locale)
                      : ff.label

                    const resolvedSubtitle = typeof ff.subtitle === 'object' && ff.subtitle !== null
                      ? buildCompositeLabel(ff.subtitle, systemLinks, formFieldStyles.helperText, locale)
                      : ff.subtitle

                    const rawDisplay = typeof ff.label === 'string' ? ff.label : (ff.validationLabel ?? 'This field')
                    const displayLabelString = typeof rawDisplay === 'object' && rawDisplay !== null
                      ? (rawDisplay[locale] || rawDisplay.en || String(rawDisplay))
                      : String(rawDisplay ?? '')

                    const otherInputProps = ff.otherInputProps || ff.ui_metadata?.otherInputProps || ff.ui_metadata?.otherInput || ff.uiMetadata?.otherInput

                    return (
                      <View
                        key={ff.name}
                        ref={(node) => { fieldRefs.current[ff.name] = node }}
                        style={[styles.rowField, isWide ? styles.rowFieldWide : styles.rowFieldNarrow]}
                      >
                        <Controller
                          control={control}
                          name={ff.name as any}
                          rules={{
                            required: ff.required ? `${ff.validationLabel ?? displayLabelString} is required` : false,
                            validate: (val) => {
                              if (!val) return true
                              const patternStr = ff.pattern || ff.ui_metadata?.pattern || ff.uiMetadata?.pattern || otherInputProps?.pattern
                              const valMsg = ff.ui_metadata?.validationMessage || ff.uiMetadata?.validationMessage || otherInputProps?.validationMessage || 'Invalid format'
                              if (patternStr) {
                                try {
                                  const rx = new RegExp(patternStr)
                                  if (!rx.test(String(val).trim())) {
                                    return valMsg
                                  }
                                } catch (e) {
                                  // ignore invalid regex
                                }
                              }
                              return true
                            }
                          }}
                          render={({ field: { onChange, value } }) => {
                            const isFieldDisabled = isFormLocked || disabledFields.includes(ff.name)

                            if (ff.fieldType === 'checkbox') {
                              const checked = !!value
                              return (
                                <View pointerEvents={isFieldDisabled ? 'none' : 'auto'}>
                                  <FormCheckbox
                                    variant="form"
                                    label={resolvedLabel}
                                    subtitle={resolvedSubtitle}
                                    required={!!ff.required}
                                    disabled={isFieldDisabled}
                                    value={checked}
                                    onValueChange={(v) => onChange(v)}
                                    additionalStyle={styles.inputShadow}
                                    error={(errors as any)[ff.name]?.message}
                                  />
                                </View>
                              )
                            }

                            if (ff.fieldType === 'radio') {
                              const radioValue = Array.isArray(value)
                                ? value
                                : typeof value === 'string'
                                  ? value
                                  : undefined

                              return (
                                <View pointerEvents={isFieldDisabled ? 'none' : 'auto'}>
                                  <FormRadio
                                    title={resolvedLabel}
                                    options={ff.options || []}
                                    multiple={!!ff.multiple}
                                    layout={ff.layout || 'vertical'}
                                    subtitle={resolvedSubtitle}
                                    disabled={isFieldDisabled}
                                    value={radioValue}
                                    onChange={(next: any) => onChange(next)}
                                    required={!!ff.required}
                                    variant="form"
                                    additionalStyle={styles.inputShadow}
                                    error={(errors as any)[ff.name]?.message}
                                  />
                                </View>
                              )
                            }

                            const controlledValue = value == null ? '' : String(value)

                            if (ff.fieldType === 'select' && ff.options?.length) {
                              return (
                                <View pointerEvents={isFieldDisabled ? 'none' : 'auto'}>
                                  <StyledSelect
                                    label={resolvedLabel}
                                    value={controlledValue}
                                    placeholder={ff.placeholder}
                                    options={ff.options}
                                    subtitle={resolvedSubtitle}
                                    required={ff.required}
                                    disabled={isFieldDisabled}
                                    onValueChange={(nextValue: any) => onChange(nextValue)}
                                    additionalStyle={styles.inputShadow}
                                    error={(errors as any)[ff.name]?.message}
                                  />
                                </View>
                              )
                            }

                            if (ff.fieldType === 'autocomplete' && ff.autocompleteData?.length) {
                              return (
                                <View pointerEvents={isFieldDisabled ? 'none' : 'auto'}>
                                  <StyledAutocomplete
                                    label={resolvedLabel}
                                    placeholder={ff.placeholder}
                                    subtitle={resolvedSubtitle}
                                    required={ff.required}
                                    disabled={isFieldDisabled}
                                    textContentType={ff.textContentType as any}
                                    additionalStyle={styles.inputShadow}
                                    onChangeText={onChange}
                                    value={controlledValue}
                                    error={(errors as any)[ff.name]?.message}
                                    options={ff.autocompleteData}
                                  />
                                </View>
                              )
                            }

                            if (ff.fieldType === 'segmented' && ff.options?.length) {
                              return (
                                <View pointerEvents={isFieldDisabled ? 'none' : 'auto'}>
                                  <StyledSegmented
                                    label={resolvedLabel}
                                    value={controlledValue}
                                    options={ff.options}
                                    subtitle={resolvedSubtitle}
                                    required={ff.required}
                                    disabled={isFieldDisabled}
                                    onValueChange={(nextValue: any) => onChange(nextValue)}
                                    additionalStyle={styles.inputShadow}
                                    error={(errors as any)[ff.name]?.message}
                                    otherInputProps={otherInputProps}
                                  />
                                </View>
                              )
                            }

                            if (ff.fieldType === 'file') {
                              const bucketName = (ff as any).bucketName || (ff as any).ui_metadata?.bucketName || 'resumes'
                              const fileNamePrefix = (ff as any).fileNamePrefix || (ff as any).ui_metadata?.fileNamePrefix || ff.name
                              return (
                                <View style={{ width: '100%' }} pointerEvents={isFieldDisabled ? 'none' : 'auto'}>
                                  <StyledFileInput
                                    label={resolvedLabel}
                                    value={controlledValue}
                                    placeholder={ff.placeholder}
                                    subtitle={resolvedSubtitle}
                                    required={ff.required}
                                    disabled={isFieldDisabled}
                                    bucketName={bucketName}
                                    fileNamePrefix={fileNamePrefix}
                                    fileSelectorProps={ff.fileSelectorProps}
                                    onValueChange={(nextValue: any) => onChange(nextValue)}
                                    additionalStyle={styles.inputShadow}
                                    error={(errors as any)[ff.name]?.message}
                                  />
                                </View>
                              )
                            }

                            return (
                              <StyledInput
                                label={resolvedLabel}
                                placeholder={ff.placeholder}
                                subtitle={resolvedSubtitle}
                                required={ff.required}
                                textContentType={ff.textContentType as any}
                                height={ff.height}
                                additionalStyle={styles.inputShadow}
                                onChangeText={onChange}
                                value={controlledValue}
                                error={(errors as any)[ff.name]?.message}
                                editable={!isFieldDisabled}
                              />
                            )
                          }}
                        />
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>
        ))}
      </View>

      {!isFormLocked && (
        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={styles.buttonRow}>
            <PillButton
              title={t('applicant.submit')}
              onPress={handleSubmit(
                async (data) => {
                  try {
                    await onSubmit(data as ApplicantFormData)
                    setShowConfetti(true)
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  } catch (e) {
                    alert('Failed to submit application.')
                  }
                },
                (invalidErrors) => {
                  scrollToFirstError(invalidErrors)
                }
              )}
              additionalStyle={styles.submitButton}
            />
          </View>

          {missingErrorCount > 0 && (
            <View style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 14, width: '100%', maxWidth: 400, alignItems: 'center' }}>
              <Text style={{ color: '#b91c1c', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
                {t('applicant.mandatoryMissing', { count: missingErrorCount })}
              </Text>
            </View>
          )}
        </View>
      )}

      <ConfettiOverlay active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {!isClosed && saveStatus === 'saving' && (
        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 10, fontStyle: 'italic', textAlign: 'center' }}>
          {t('applicant.savingDraft')}
        </Text>
      )}
      {!isClosed && saveStatus === 'saved' && (
        <Text style={{ color: '#10b981', fontSize: 13, marginTop: 10, fontWeight: '600', textAlign: 'center' }}>
          {t('applicant.progressSaved')}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 1000,
    gap: 16,
    marginVertical: 24,
    backgroundColor: "#f4f4f4",
    ...Platform.OS === 'web' ? { 
        paddingVertical: 40,
        paddingHorizontal: 40,
    } : {
      paddingHorizontal: 20,
      paddingVertical: 30, 
    },   
    borderRadius: 24,
  },
  heading: {
    color: formFieldColors.theme,
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 10,
  },
  section: {
    width: '100%',
    gap: 8,
  },
  sectionTitle: {
    color: formFieldColors.accent,
    fontSize: 25,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    width: '100%',
    marginBottom: 8,
  },
  sectionHeaderText: {
    color: formFieldColors.titleText,
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    width: '100%',
    gap: 12,
  },
  rowWide: {
    flexDirection: 'row',
    width: '100%',
    gap: 30
  },
  rowNarrow: {
    flexDirection: 'column',
    width: '100%',
  },
  rowField: {
  },
  rowFieldWide: {
    flex: 1,
  },
  rowFieldNarrow: {
    width: '100%',
  },
  dividerRow: {
    width: '100%',
    marginVertical: 8,
  },
  paragraphRow: {
    width: '100%',
    marginVertical: 8,
  },
  paragraphText: {
    color: formFieldColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    flexWrap: 'wrap',
    ...Platform.select({
      web: { wordBreak: 'break-word', overflowWrap: 'break-word' } as any,
    }),
  },
  divider: {
    width: '100%',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: formFieldColors.borderColor,
  },
  inputShadow: {
    
  },
  shadow: {
     ...Platform.select({
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      },
      web: {
        textShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      }
    })
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    marginTop: 20,
  },
  draftButton: {
    backgroundColor: '#6b7280',
    flex: 1,
    maxWidth: 200,
  },
  submitButton: {
    flex: 1,
    maxWidth: 200,
  },
  downloadBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  downloadBannerText: {
    color: formFieldColors.titleText,
    fontSize: 14,
    lineHeight: 20,
  },
  downloadBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  downloadBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
