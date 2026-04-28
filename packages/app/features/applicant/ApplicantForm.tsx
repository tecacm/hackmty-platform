'use client'

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { StyledInput } from 'app/components/styled-input'
import { StyledSelect } from 'app/components/styled-select'
import { StyledAutocomplete } from 'app/components/styled-autocomplete'
import { StyledSegmented } from 'app/components/styled-segmented'
import { PillButton } from 'app/components/pill-button'
import { getApplicantFieldsForRole } from './applicant-field-config'
import { ApplicantRole, ApplicantFormData } from './applicant-types'

type ApplicantFormProps = {
  role: ApplicantRole
  initialValues?: Partial<ApplicantFormData>
  onSubmit: (data: ApplicantFormData) => void
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
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
      <Text style={[styles.heading, { fontSize: dynamicHeadingSize }]}>
        Applying as {role.charAt(0).toUpperCase() + role.slice(1)}
      </Text>

      {Object.entries(sections).map(([sectionName, sectionFields]) => (
        <View key={sectionName} style={styles.section}>
          {sectionName !== 'General' && <Text style={styles.sectionTitle}>{sectionName}</Text>}

          {chunkArray(sectionFields, 2).map((rowFields, rowIndex) => (
            <View key={`${sectionName}-${rowIndex}`} style={[styles.row, isWide ? styles.rowWide : styles.rowNarrow]}>
              {rowFields.map((field) => (
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
              ))}
            </View>
          ))}
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
    maxWidth: 920,
    gap: 16,
    marginBottom: 24,
  },
  heading: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 10,
  },
  section: {
    width: '100%',
    gap: 8,
  },
  sectionTitle: {
    color: '#c2b75f',
    fontSize: 18,
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
  inputShadow: {
     ...Platform.select({
       native: {
         shadowColor: '#000000',
         shadowOffset: { width: 0, height: 10 },
         shadowOpacity: 0.4,
         shadowRadius: 8,
         elevation: 4,      
       },
       web: {
         filter: 'drop-shadow(0px 10px 8px rgba(0, 0, 0, 0.4))',
       }
     })
   }
})