import React, { useState, useEffect, ReactNode } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native'
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
import { getApplicantFieldsForRole, type ApplicantField } from './applicant-field-config'
import applicationFieldsConfig from 'app/data/application-fields.json'
import { ApplicantRole, ApplicantFormData } from './applicant-types'
import { formFieldColors } from 'app/components/form-field-styles'

type ApplicantFormProps = {
  role: ApplicantRole
  fields?: ApplicantField[]
  initialValues?: Partial<ApplicantFormData>
  disabledFields?: string[]
  status?: string | null
  onSubmit: (data: ApplicantFormData) => void
  onSaveDraft?: (data: ApplicantFormData) => void
  systemLinks?: Record<string, { text: any; href: string }>
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

type HeaderConfig = { section: string; label: string; order?: number }

function getSectionHeaders(sectionId: string): SectionHeader[] {
  const headers = (applicationFieldsConfig.headers as Record<string, HeaderConfig> | undefined) || {}
  return headers
    ? Object.entries(headers)
        .filter(([, header]) => header.section === sectionId)
        .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
        .map(([key, header]) => ({ key, text: header.label }))
    : []
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
  React.createElement(
    TextLink,
    { href, style: { color: applicationFieldsConfig.styles.linkColor, textDecorationLine: applicationFieldsConfig.styles.linkDecoration }, children: text }
  )

// Helper function to build React components from composite label definitions
const buildCompositeLabel = (labelDef: any, systemLinks: Record<string, { text: any; href: string }> = {}): ReactNode => {
  if (!labelDef) return ''
  if (typeof labelDef === 'string') return labelDef
  if (!labelDef.parts) return ''
  
  const titleColor = formFieldColors.titleText
  
  const parts = labelDef.parts.map((part: any) => {
    if (part.type === 'text') return part.content
    if (part.type === 'space') return ' '
    if (part.type === 'link' && part.linkRef) {
      const linkDef = systemLinks[part.linkRef] || (applicationFieldsConfig.links as any)[part.linkRef]
      if (!linkDef) return part.linkRef
      const linkText = typeof linkDef.text === 'object' && linkDef.text !== null
        ? (linkDef.text.en || linkDef.text)
        : linkDef.text
      return createMLHLink(linkText, linkDef.href)
    }
    return null
  }).filter(Boolean)
  
  return React.createElement(
    Text,
    { style: { color: titleColor } },
    ...parts
  )
}

export function ApplicantForm({
  role,
  fields: propFields,
  initialValues = {},
  disabledFields = [],
  status = null,
  onSubmit,
  onSaveDraft,
  systemLinks = {}
}: ApplicantFormProps) {
  const allFields = propFields || getApplicantFieldsForRole(role)
  const { width } = useWindowDimensions()
  const [isReady, setIsReady] = useState(false)
  const isWide = width >= 520

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

  // Populate form with initial values when they are loaded and ready
  useEffect(() => {
    if (isReady && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        ...defaultValues,
        ...(initialValues as object),
      } as Partial<ApplicantFormData>)
    }
  }, [initialValues, isReady, reset])

  // Auto-save draft on change when form is dirty
  useEffect(() => {
    if (!onSaveDraft || !isReady || !isDirty) return

    setSaveStatus('saving')
    const handler = setTimeout(async () => {
      try {
        await onSaveDraft(currentValues as ApplicantFormData)
        reset(currentValues) // Reset form defaultValues to currentValues to clear isDirty flag
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

  const roleFieldNames = new Set(allFields.map((field: any) => field.name))

  const fields = allFields.filter((field: any) => {
    if (!field.dependsOn) return true
    if (!roleFieldNames.has(field.dependsOn.field)) return true
    const dependentValue = (currentValues as Record<string, unknown>)[field.dependsOn.field]
    return dependentValue === field.dependsOn.value
  })

  const sectionMap = new Map<string, { key: string; id: string; label: string; order: number; fields: typeof fields }>()

  fields.forEach((field) => {
    const sec = (field as any).section as SectionRef | undefined
    const id = typeof sec === 'string' || !sec ? (sec ?? 'General') : (sec as any).id ?? 'General'
    const key = (field as any).sectionKey ?? (typeof sec === 'string' ? sec : undefined) ?? id
    const label = typeof sec === 'object' && (sec as any).label ? (sec as any).label : id
    const order = typeof sec === 'object' && typeof (sec as any).order === 'number' ? (sec as any).order : 0

    if (!sectionMap.has(key)) sectionMap.set(key, { key, id, label, order, fields: [] as typeof fields })
    sectionMap.get(key)!.fields.push(field)
  })

  const sections = Array.from(sectionMap.values()).sort((a, b) => a.order - b.order)

  // Avoid hydration mismatch by waiting for client width calculation
  if (!isReady) {
    return <View style={styles.container} />
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <Text style={[styles.heading, { fontSize: dynamicHeadingSize }, styles.shadow]}> 
          Applying as {role.charAt(0).toUpperCase() + role.slice(1)}
        </Text>
      )}

      {sections.map(({ key: sectionKey, id: sectionName, label: sectionLabel, fields: sectionFields }) => (
        <View key={sectionKey} style={styles.section}>
          {sectionName !== 'General' && <Text style={styles.sectionTitle}>{sectionLabel ?? sectionName}</Text>}

          {getSectionHeaders(sectionKey).map((header) => (
            <View key={`${sectionKey}-${header.key}`} style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderText}>{header.text}</Text>
            </View>
          ))}

          {buildSectionRows(sectionFields).map((row, rowIndex) => {
            if (row.type === 'divider') {
              const f: any = row.field
              if (f.fieldType === 'paragraph') {
                return (
                  <View key={`${sectionKey}-${rowIndex}-paragraph`} style={styles.paragraphRow}>
                    <Text style={styles.paragraphText}>{f.content}</Text>
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
                    ? buildCompositeLabel(ff.label, systemLinks)
                    : ff.label

                  const displayLabelString = typeof ff.label === 'string' ? ff.label : (ff.validationLabel ?? 'This field')

                  return (
                    <View key={ff.name} style={[styles.rowField, isWide ? styles.rowFieldWide : styles.rowFieldNarrow]}>
                      <Controller
                        control={control}
                        name={ff.name as any}
                        rules={{ required: ff.required ? `${ff.validationLabel ?? displayLabelString} is required` : false }}
                        render={({ field: { onChange, value } }) => {
                          if (ff.fieldType === 'checkbox') {
                            const checked = !!value
                            return (
                              <FormCheckbox
                                variant="form"
                                label={resolvedLabel}
                                subtitle={ff.subtitle}
                                required={!!ff.required}
                                value={checked}
                                onValueChange={(v) => onChange(v)}
                                additionalStyle={styles.inputShadow}
                                error={(errors as any)[ff.name]?.message}
                              />
                            )
                          }

                          if (ff.fieldType === 'radio') {
                            const radioValue = Array.isArray(value)
                              ? value
                              : typeof value === 'string'
                                ? value
                                : undefined

                            return (
                              <FormRadio
                                title={resolvedLabel}
                                options={ff.options || []}
                                multiple={!!ff.multiple}
                                layout={ff.layout || 'vertical'}
                                subtitle={ff.subtitle}
                                value={radioValue}
                                onChange={(next: any) => onChange(next)}
                                required={!!ff.required}
                                variant="form"
                                additionalStyle={styles.inputShadow}
                                error={(errors as any)[ff.name]?.message}
                              />
                            )
                          }

                          const controlledValue = value == null ? '' : String(value)

                          if (ff.fieldType === 'select' && ff.options?.length) {
                            return (
                              <StyledSelect
                                label={resolvedLabel}
                                value={controlledValue}
                                placeholder={ff.placeholder}
                                options={ff.options}
                                subtitle={ff.subtitle}
                                required={ff.required}
                                onValueChange={(nextValue: any) => onChange(nextValue)}
                                additionalStyle={styles.inputShadow}
                                error={(errors as any)[ff.name]?.message}
                              />
                            )
                          }

                          if (ff.fieldType === 'autocomplete' && ff.autocompleteData?.length) {
                            return (
                              <StyledAutocomplete
                                label={resolvedLabel}
                                placeholder={ff.placeholder}
                                subtitle={ff.subtitle}
                                required={ff.required}
                                textContentType={ff.textContentType as any}
                                additionalStyle={styles.inputShadow}
                                onChangeText={onChange}
                                value={controlledValue}
                                error={(errors as any)[ff.name]?.message}
                                options={ff.autocompleteData}
                              />
                            )
                          }

                          if (ff.fieldType === 'segmented' && ff.options?.length) {
                            return (
                              <StyledSegmented
                                label={resolvedLabel}
                                value={controlledValue}
                                options={ff.options}
                                subtitle={ff.subtitle}
                                required={ff.required}
                                onValueChange={(nextValue: any) => onChange(nextValue)}
                                additionalStyle={styles.inputShadow}
                                error={(errors as any)[ff.name]?.message}
                              />
                            )
                          }

                          if (ff.fieldType === 'file') {
                            return (
                              <StyledFileInput
                                label={resolvedLabel}
                                value={controlledValue}
                                placeholder={ff.placeholder}
                                subtitle={ff.subtitle}
                                required={ff.required}
                                fileSelectorProps={ff.fileSelectorProps}
                                onValueChange={(nextValue: any) => onChange(nextValue)}
                                additionalStyle={styles.inputShadow}
                                error={(errors as any)[ff.name]?.message}
                              />
                            )
                          }

                          return (
                            <StyledInput
                              label={resolvedLabel}
                              placeholder={ff.placeholder}
                              subtitle={ff.subtitle}
                              required={ff.required}
                              textContentType={ff.textContentType as any}
                              height={ff.height}
                              additionalStyle={styles.inputShadow}
                              onChangeText={onChange}
                              value={controlledValue}
                              error={(errors as any)[ff.name]?.message}
                              editable={!disabledFields.includes(ff.name)}
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

      <View style={styles.buttonRow}>
        <PillButton
          title={status === 'submitted' ? 'Submitted' : 'Submit'}
          onPress={handleSubmit(async (data) => {
            try {
              await onSubmit(data as ApplicantFormData)
              alert('Application submitted successfully!')
            } catch (e) {
              alert('Failed to submit application.')
            }
          })}
          additionalStyle={styles.submitButton}
        />
      </View>

      {saveStatus === 'saving' && (
        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 10, fontStyle: 'italic', textAlign: 'center' }}>
          Saving draft progress...
        </Text>
      )}
      {saveStatus === 'saved' && (
        <Text style={{ color: '#10b981', fontSize: 13, marginTop: 10, fontWeight: '600', textAlign: 'center' }}>
          ✓ Progress saved automatically
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
})
