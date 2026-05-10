'use client'

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { StyledInput } from 'app/components/styled-input'
import { StyledSelect } from 'app/components/styled-select'
import { StyledAutocomplete } from 'app/components/styled-autocomplete'
import { StyledSegmented } from 'app/components/styled-segmented'
import { StyledFileInput } from 'app/components/styled-file-input'
import { FormCheckbox } from 'app/components/form-checkbox'
import FormRadio from 'app/components/form-radio'
import { PillButton } from 'app/components/pill-button'
import { getApplicantFieldsForRole } from './applicant-field-config'
import applicationFieldsConfig from 'app/data/application-fields.json'
import { ApplicantRole, ApplicantFormData } from './applicant-types'
import { formFieldColors } from 'app/components/form-field-styles'

type ApplicantFormProps = {
  role: ApplicantRole
  initialValues?: Partial<ApplicantFormData>
  onSubmit: (data: ApplicantFormData) => void
}

type SectionRow<T> =
  | { type: 'divider'; field: T }
  | { type: 'fields'; fields: T[] }

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

export function ApplicantForm({ role, initialValues = {}, onSubmit }: ApplicantFormProps) {
  const allFields = getApplicantFieldsForRole(role)
  const { width } = useWindowDimensions()
  const [isReady, setIsReady] = useState(false)
  const isWide = width >= 520

  const dynamicHeadingSize = Math.round(Math.min(50, Math.max(24, width * 0.07)))

  useEffect(() => {
    setIsReady(true)
  }, [])

  type SectionRef = string | { id: string; label?: string; order?: number }

  const { control, handleSubmit, watch, formState: { errors } } = useForm<Partial<ApplicantFormData>>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      country: '',
      university: '',
      resume: '',
      phone: '',
      gender: '',
      consentFoodAllergies: false,
      firstHackathon: '',
      participatedRoles: [],
      studyingOrWorking: '',
      workPlace: '',
      age: undefined,
      year: '',
      ...(initialValues as object),
    } as Partial<ApplicantFormData>,
  })

  const currentValues = watch()

  const fields = allFields.filter((field: any) => {
    if (!field.dependsOn) return true
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
        <Text style={[styles.heading, { fontSize: dynamicHeadingSize }]}> 
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

                  return (
                    <View key={ff.name} style={[styles.rowField, isWide ? styles.rowFieldWide : styles.rowFieldNarrow]}>
                      <Controller
                        control={control}
                        name={ff.name as any}
                        rules={{ required: ff.required ? `${ff.validationLabel ?? ff.label} is required` : false }}
                        render={({ field: { onChange, value } }) => {
                          if (ff.fieldType === 'checkbox') {
                            const checked = !!value
                            return (
                              <FormCheckbox
                                variant="form"
                                label={ff.label}
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
                            return (
                              <FormRadio
                                title={ff.label}
                                options={ff.options || []}
                                multiple={!!ff.multiple}
                                layout={ff.layout || 'vertical'}
                                subtitle={ff.subtitle}
                                value={value}
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
                                label={ff.label}
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
                                label={ff.label}
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
                                label={ff.label}
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
                                label={ff.label}
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
                              label={ff.label}
                              placeholder={ff.placeholder}
                              subtitle={ff.subtitle}
                              required={ff.required}
                              textContentType={ff.textContentType as any}
                              height={ff.height}
                              additionalStyle={styles.inputShadow}
                              onChangeText={onChange}
                              value={controlledValue}
                              error={(errors as any)[ff.name]?.message}
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

      <PillButton title="Submit" onPress={handleSubmit((data) => onSubmit(data as ApplicantFormData))} /> 
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
    
   }
})
