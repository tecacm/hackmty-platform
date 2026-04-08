
import { ApplicantRole } from './applicant-types'

export type ApplicantBaseField = {
  name: string
  label: string
  placeholder: string
  textContentType?: string
  required?: boolean
  section?: string
  subtitle?: string
  fieldType?: 'text' | 'select'
  options?: { label: string; value: string }[]
}

export const applicantCommonFields: ApplicantBaseField[] = [
  { name: 'firstName', label: 'First Name', placeholder: 'Enter first name', textContentType: 'name', required: true, section: 'Personal Info' },
  { name: 'lastName', label: 'Last Name', placeholder: 'Enter last name', textContentType: 'familyName', required: true, section: 'Personal Info' },
  { name: 'email', label: 'Email', placeholder: 'Enter email', textContentType: 'emailAddress', required: true, section: 'Personal Info' },
  { name: 'country', label: 'Country', placeholder: 'Enter country', textContentType: 'addressCity', required: true, section: 'Personal Info' },
  { name: 'university', label: 'University', placeholder: 'Enter university', required: true, section: 'Personal Info' },
  { name: 'phone', label: 'Phone', placeholder: '+#########', textContentType: 'telephoneNumber', required: true, section: 'Personal Info', subtitle: 'Phone number must be entered in the format: +#########. Up to 15 digits allowed.' },
  { name: 'age', label: 'Age', placeholder: 'Age as of date of HackMTY', textContentType: 'none', required: true, section: 'Personal Info',subtitle: 'Enter your age in years as will be on the date of the event. We will not store your exact birth date, only an inferred year.'},
  { name: 'gender', label: 'What gender do you identify with?', placeholder: 'Select gender', textContentType: 'none', required: true, section: 'Personal Info', subtitle: 'This is for demographic purposes. You can skip this question if you want.', fieldType: 'select', options: [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'nonbinary' },
    { label: 'Prefer not to answer', value: 'prefer_not_to_answer' },
  ]},
]

export const specificFields: Record<ApplicantRole, ApplicantBaseField[]> = {
  volunteer: [
    { name: 'availability', label: 'Availability', placeholder: 'e.g., weekends', required: true },
    { name: 'skills', label: 'Skills', placeholder: 'Your technical/soft skills', required: true },
  ],
  mentor: [
    { name: 'company', label: 'Company', placeholder: 'Your company', required: true },
    { name: 'jobPosition', label: 'Job Position', placeholder: 'Your role', required: true },
    { name: 'mentorshipAreas', label: 'Mentorship Areas', placeholder: 'e.g., web, mobile', required: true },
  ],
  hacker: [
    { name: 'projectIdea', label: 'Project Idea', placeholder: 'Brief idea description', required: true },
    { name: 'github', label: 'GitHub', placeholder: 'GitHub profile URL', required: false },
  ],
  sponsor: [
    { name: 'company', label: 'Company', placeholder: 'Company name', required: true },
    { name: 'budget', label: 'Estimated Budget', placeholder: 'e.g., $10k', required: true },
    { name: 'isHiddenSponsor', label: 'Hidden Sponsor', placeholder: 'true/false', required: false },
  ],
}

export const getApplicantFieldsForRole = (role: ApplicantRole) => [...applicantCommonFields, ...specificFields[role]]
