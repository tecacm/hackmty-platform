
import { ApplicantRole } from './applicant-types'
import React, { type ReactNode } from 'react'
import { Text } from 'react-native'
import { TextLink } from 'solito/link'
import countries from 'app/data/static/countries.json'
import universities from 'app/data/static/universities.json'
import majors from 'app/data/static/degrees.json'
import applicationFieldsConfig from 'app/data/application-fields.json'
import applicationTypesConfig from 'app/data/application-types.json'
import type { FileSelectorProps } from 'app/components/styled-file-input'
import { formFieldColors } from 'app/components/form-field-styles'

// Load sections from JSON
export const SECTIONS = applicationFieldsConfig.sections as any

// Build dynamic data sources
const currentYear = new Date().getFullYear()
const graduationYearOptions = Array.from({ length: 6 }, (_, index) => {
  const year = currentYear - 1 + index
  return { label: String(year), value: String(year) }
})

// Map for resolving data references in JSON
const dataReferences: Record<string, any[]> = {
  universities,
  countries,
  majors,
  graduationYears: graduationYearOptions,
}

// Map for resolving special content refs
const contentReferences: Record<string, string> = Object.values(applicationFieldsConfig.headers || {}).reduce(
  (accumulator, sectionHeaders) => ({ ...accumulator, ...(sectionHeaders as Record<string, string>) }),
  {}
)

// Function to create React component for hyperlinked labels
const createMLHLink = (text: string, href: string) =>
  React.createElement(
    TextLink,
    { href, style: { color: applicationFieldsConfig.styles.linkColor, textDecorationLine: applicationFieldsConfig.styles.linkDecoration }, children: text }
  )

// Function to build React components from JSON label definitions
const buildCompositeLabel = (labelDef: any): ReactNode => {
  if (!labelDef || !labelDef.parts) return ''
  
  const titleColor = formFieldColors.titleText
  
  const parts = labelDef.parts.map((part: any, index: number) => {
    if (part.type === 'text') return part.content
    if (part.type === 'space') return ' '
    if (part.type === 'link' && part.linkRef) {
      const linkDef = (applicationFieldsConfig.links as any)[part.linkRef as keyof typeof applicationFieldsConfig.links]
      if (!linkDef) return part.linkRef
      return createMLHLink(linkDef.text, linkDef.href)
    }
    return null
  }).filter(Boolean)
  
  return React.createElement(
    Text,
    { style: { color: titleColor } },
    ...parts
  )
}

// Map for resolving special label refs from JSON
const labelReferences: Record<string, ReactNode> = {
  codeOfConductLabel: buildCompositeLabel(applicationFieldsConfig.labels?.codeOfConduct),
  privacyPolicyLabel: buildCompositeLabel(applicationFieldsConfig.labels?.privacyPolicy),
}

// Map for file type configurations
const fileTypeConfigs: Record<string, FileSelectorProps> = {
  pdf: {
    acceptedMimeTypes: ['application/pdf'],
    acceptedExtensions: ['pdf'],
    maxSizeBytes: 5 * 1024 * 1024,
    invalidFileTypeMessage: 'Resume must be a PDF.',
    invalidFileSizeMessage: 'Resume must be 5 MB or smaller.',
    fileSizeUnknownMessage: 'Resume size could not be verified. Please choose another PDF.',
  },
}

// Function to process a field definition from JSON
function processFieldDefinition(fieldDef: any): ApplicantField {
  const field = { ...fieldDef } as any

  if (fieldDef?.section) {
    field.sectionKey = fieldDef.section
  }
  
  // Resolve section references
  if (typeof field.section === 'string') {
    field.section = SECTIONS[field.section as keyof typeof SECTIONS]
  }

  // Resolve autocomplete data references
  if (field.autocompleteDataRef && dataReferences[field.autocompleteDataRef]) {
    field.autocompleteData = dataReferences[field.autocompleteDataRef]
    delete field.autocompleteDataRef
  }

  // Resolve options references
  if (field.optionsRef && dataReferences[field.optionsRef]) {
    field.options = dataReferences[field.optionsRef]
    delete field.optionsRef
  }

  // Resolve label references (React components)
  if (field.labelRef && labelReferences[field.labelRef]) {
    field.label = labelReferences[field.labelRef]
    delete field.labelRef
  }

  // Resolve content references
  if (field.contentRef && contentReferences[field.contentRef]) {
    field.content = contentReferences[field.contentRef]
    delete field.contentRef
  }

  // Resolve file type configurations
  if (field.fileTypeRef && fileTypeConfigs[field.fileTypeRef]) {
    field.fileSelectorProps = fileTypeConfigs[field.fileTypeRef]
    delete field.fileTypeRef
  }

  return field as ApplicantField
}

type SectionRef = string | { id: string; label?: string; order?: number }

type ApplicantFormField = {
  name: string
  label: string | ReactNode
  validationLabel?: string
  placeholder: string
  textContentType?: string
  required?: boolean
  section?: SectionRef
  sectionKey?: string
  subtitle?: string
  fieldType?: 'text' | 'select' | 'autocomplete' | 'segmented' | 'file' | 'checkbox' | 'radio'
  options?: { label: string; value: string }[]
  multiple?: boolean
  layout?: 'vertical' | 'horizontal-wrap'
  autocompleteData?: string[]
  fileSelectorProps?: FileSelectorProps
  height?: number
  dependsOn?: { field: string; value: any }
}

type ApplicantDividerField = {
  name: string
  fieldType: 'divider'
  section?: SectionRef
}

type ApplicantParagraphField = {
  name?: string
  fieldType: 'paragraph'
  section?: SectionRef
  content: string
}

export type ApplicantBaseField = ApplicantFormField
export type ApplicantField = ApplicantFormField | ApplicantDividerField | ApplicantParagraphField

type ApplicationTypeConfig = {
  id: string
  label: string
  fields: Array<string | { name: string; section?: string }>
}

// Build all fields from JSON configuration
const allFieldsFromJson = [
  ...Object.entries(applicationFieldsConfig.fields as any).map(([fieldKey, fieldDef]) =>
    processFieldDefinition({ ...(fieldDef as any), sectionKey: (fieldDef as any)?.section, fieldKey })
  ),
  ...Object.entries(applicationFieldsConfig.specialFields as any || {}).map(([fieldKey, fieldDef]) =>
    processFieldDefinition({ ...(fieldDef as any), sectionKey: (fieldDef as any)?.section, fieldKey })
  ),
]
const fieldsByName = new Map(allFieldsFromJson.map(f => [f.name, f]))

// Helper to get fields by name
const resolveFieldRef = (fieldRef: string | { name: string; section?: string }): ApplicantField | null => {
  const fieldName = typeof fieldRef === 'string' ? fieldRef : fieldRef.name
  const field = fieldsByName.get(fieldName)
  if (!field) return null

  if (typeof fieldRef === 'string' || !fieldRef.section) {
    return field
  }

  const nextField = { ...field, sectionKey: fieldRef.section, section: SECTIONS[fieldRef.section as keyof typeof SECTIONS] ?? field.section }
  return nextField
}

const getFieldsByNames = (names: Array<string | { name: string; section?: string }>): ApplicantField[] => 
  names.map(resolveFieldRef).filter((field): field is ApplicantField => Boolean(field))

const applicationTypes = (applicationTypesConfig.applicationTypes || []) as ApplicationTypeConfig[]

// Dynamically build role configurations from JSON - no hardcoding
const roleConfigurations = new Map(
  applicationTypes.map((type) => [type.id, type])
)

// Discover all available roles from JSON
export const getAvailableRoles = (): string[] => Array.from(roleConfigurations.keys())

// Main export function - now generic, works with any role from JSON
export const getApplicantFieldsForRole = (role: string | ApplicantRole): ApplicantField[] => {
  const roleConfig = roleConfigurations.get(role as string)
  if (!roleConfig) return []
  return getFieldsByNames(roleConfig.fields)
}
