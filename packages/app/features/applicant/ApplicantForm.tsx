'use client'

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { StyledInput } from 'app/components/styled-input'
import { StyledSelect } from 'app/components/styled-select'
import { StyledAutocomplete } from 'app/components/styled-autocomplete'
import { StyledSegmented } from 'app/components/styled-segmented'
import { StyledFileInput } from 'app/components/styled-file-input'
import { PillButton } from 'app/components/pill-button'
import { getApplicantFieldsForRole } from './applicant-field-config'
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

function buildSectionRows<T extends { fieldType?: string }>(fields: T[]): SectionRow<T>[] {
  const rows: SectionRow<T>[] = []
  let pendingFields: T[] = []

  fields.forEach((field) => {
    if (field.fieldType === 'divider') {
      if (pendingFields.length) {
        rows.push({ type: 'fields', fields: pendingFields })
        pendingFields = []
      }

      rows.push({ type: 'divider', field })
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
  const fields = getApplicantFieldsForRole(role)
  const { width } = useWindowDimensions()
  const [isReady, setIsReady] = useState(false)
  const isWide = width >= 520

  const dynamicHeadingSize = Math.round(Math.min(50, Math.max(24, width * 0.07)))

  useEffect(() => {
    setIsReady(true)
  }, [])

  const sections = fields.reduce<Record<string, typeof fields>>((acc, field) => {
    const sectionName = field.section ?? 'General'
    if (!acc[sectionName]) acc[sectionName] = []
    acc[sectionName].push(field)
    return acc
  }, {})

  const { control, handleSubmit, formState: { errors } } = useForm<ApplicantFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      country: '',
      university: '',
      resume: '',
      phone: '',
      gender: '',
      age: undefined,
      year: '',
      ...(initialValues as object),
    } as ApplicantFormData,
  })

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

      {Object.entries(sections).map(([sectionName, sectionFields]) => (
        <View key={sectionName} style={styles.section}>
          {sectionName !== 'General' && <Text style={styles.sectionTitle}>{sectionName}</Text>}

          {buildSectionRows(sectionFields).map((row, rowIndex) => {
            if (row.type === 'divider') {
              return (
                <View key={`${sectionName}-${row.field.name}-${rowIndex}`} style={styles.dividerRow}>
                  <FormDivider />
                </View>
              )
            }

            return (
              <View key={`${sectionName}-${rowIndex}`} style={[styles.row, isWide ? styles.rowWide : styles.rowNarrow]}>
                {row.fields.map((field) => (
                  field.fieldType === 'divider' ? (
                    <View key={field.name} style={[styles.rowField, styles.rowFieldNarrow]}>
                      <FormDivider />
                    </View>
                  ) : (
                    <View
                      key={field.name}
                      style={[
                        styles.rowField,
                        isWide ? styles.rowFieldWide : styles.rowFieldNarrow,
                      ]}
                    >
                      <Controller
                        control={control}
                        name={field.name as any}
                        rules={{ required: field.required ? `${field.validationLabel ?? field.label} is required` : false }}
                        render={({ field: { onChange, value } }) => {
                          const controlledValue = value == null ? '' : String(value)

                          if (field.fieldType === 'select' && field.options?.length) {
                            return (
                              <StyledSelect
                                label={field.label}
                                value={controlledValue}
                                placeholder={field.placeholder}
                                options={field.options}
                                subtitle={field.subtitle}
                                required={field.required}
                                onValueChange={(nextValue) => onChange(nextValue)}
                                additionalStyle={styles.inputShadow}
                                error={(errors as any)[field.name]?.message}
                              />
                            )
                          }

                          if (field.fieldType === 'autocomplete' && field.autocompleteData?.length) {
                            return (
                              <StyledAutocomplete
                                label={field.label}
                                placeholder={field.placeholder}
                                subtitle={field.subtitle}
                                required={field.required}
                                textContentType={field.textContentType as any}
                                additionalStyle={styles.inputShadow}
                                onChangeText={onChange}
                                value={controlledValue}
                                error={(errors as any)[field.name]?.message}
                                options={field.autocompleteData}
                              />
                            )
                          }

                          if (field.fieldType === 'segmented' && field.options?.length) {
                            return (
                              <StyledSegmented
                                label={field.label}
                                value={controlledValue}
                                options={field.options}
                                subtitle={field.subtitle}
                                required={field.required}
                                onValueChange={(nextValue) => onChange(nextValue)}
                                additionalStyle={styles.inputShadow}
                                error={(errors as any)[field.name]?.message}
                              />
                            )
                          }

                          if (field.fieldType === 'file') {
                            return (
                              <StyledFileInput
                                label={field.label}
                                value={controlledValue}
                                placeholder={field.placeholder}
                                subtitle={field.subtitle}
                                required={field.required}
                                  fileSelectorProps={field.fileSelectorProps}
                                onValueChange={(nextValue) => onChange(nextValue)}
                                additionalStyle={styles.inputShadow}
                                error={(errors as any)[field.name]?.message}
                              />
                            )
                          }

                          return (
                            <StyledInput
                              label={field.label}
                              placeholder={field.placeholder}
                              subtitle={field.subtitle}
                              required={field.required}
                              textContentType={field.textContentType as any}
                              additionalStyle={styles.inputShadow}
                              onChangeText={onChange}
                              value={controlledValue}
                              error={(errors as any)[field.name]?.message}
                            />
                          )
                        }}
                      />
                    </View>
                  )
                ))}
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
  divider: {
    width: '100%',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: formFieldColors.borderColor,
  },
  inputShadow: {
    
   }
})