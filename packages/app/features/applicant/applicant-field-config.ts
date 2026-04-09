
import { ApplicantRole } from './applicant-types'
import countries from 'app/data/static/countries.json'
import universities from 'app/data/static/universities.json'
import majors from 'app/data/static/degrees.json'

export type ApplicantBaseField = {
  name: string
  label: string
  validationLabel?: string
  placeholder: string
  textContentType?: string
  required?: boolean
  section?: string
  subtitle?: string
  fieldType?: 'text' | 'select' | 'autocomplete'
  options?: { label: string; value: string }[]
  autocompleteData?: string[]
}

const tshirtField: ApplicantBaseField = {
  name: 'tshirt',
  label: 'What\'s your T-Shirt Size?',
  validationLabel: 'T-Shirt Size',
  placeholder: 'medium',
  textContentType: 'none',
  required: true,
  section: 'Personal Info',
  fieldType: 'select',
  options: [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
    { label: 'Extra Large', value: 'xlarge' },
  ],
}

const foodField: ApplicantBaseField = {
  name: 'diet',
  label: 'Dietary Restrictions',
  validationLabel: 'Dietary Restrictions',
  placeholder: 'none',
  textContentType: 'none',
  required: true,
  section: 'Personal Info',
  fieldType: 'select',
  options: [
    { label: 'None', value: 'none' },
    { label: 'Vegetarian', value: 'vegetarian' },
    { label: 'Vegan', value: 'vegan' },
    { label: 'No pork', value: 'no_pork' },
    { label: 'Gluten-Free', value: 'gluten_free' },
  ],
}

const universityField: ApplicantBaseField = {
  name: 'university',
  label: 'What university do you attend?',
  validationLabel: 'University',
  subtitle: 'Current or most recent school you attended.',
  placeholder: 'Enter university',
  required: true,
  section: 'Personal Info',
  fieldType: 'autocomplete',
  autocompleteData: universities,
}

const majorField: ApplicantBaseField = {
  name: 'major',
  label: 'What\'s your major/degree?',
  validationLabel: 'Major',
  subtitle: 'Current or most recent major you are pursuing.',
  placeholder: 'Enter major',
  required: true,
  section: 'Personal Info',
  fieldType: 'autocomplete',
  autocompleteData: majors,
}

const countryField: ApplicantBaseField = {
  name: 'country',
  label: 'From which country are you joining us?',
  validationLabel: 'Country',
  placeholder: 'Enter country',
  textContentType: 'addressCity',
  subtitle: 'Please select one of the autocomplete options or write \'Others\'.',
  required: true,
  section: 'Personal Info',
  fieldType: 'autocomplete',
  autocompleteData: countries,
}


export const applicantCommonFields: ApplicantBaseField[] = [
  { name: 'firstName', label: 'First Name', placeholder: 'Enter first name', textContentType: 'name', required: true, section: 'Personal Info' },
  { name: 'lastName', label: 'Last Name', placeholder: 'Enter last name', textContentType: 'familyName', required: true, section: 'Personal Info' },
  { name: 'email', label: 'Email', placeholder: 'Enter email', textContentType: 'emailAddress', required: true, section: 'Personal Info' },
  { name: 'phone', label: 'Phone', placeholder: '+#########', textContentType: 'telephoneNumber', required: true, section: 'Personal Info', subtitle: 'Phone number must be entered in the format: +#########. Up to 15 digits allowed.' },
  { name: 'age', label: 'Age', placeholder: 'Age as of date of HackMTY', textContentType: 'none', required: true, section: 'Personal Info',subtitle: 'Enter your age in years as will be on the date of the event. We will not store your exact birth date, only an inferred year.'},
  { name: 'gender', label: 'What gender do you identify with?', validationLabel: 'Gender', placeholder: 'Select gender', textContentType: 'none', required: true, section: 'Personal Info', subtitle: 'This is for demographic purposes. Select "Prefer not to answer" if you do not want to disclose.', fieldType: 'select', options: [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'nonbinary' },
    { label: 'Prefer not to answer', value: 'prefer_not_to_answer' },
  ]},
]

const sharedRoleFields: Record<ApplicantRole, ApplicantBaseField[]> = {
  volunteer: [countryField, universityField, majorField, tshirtField, foodField],
  hacker: [countryField, universityField, majorField, tshirtField, foodField],
  mentor: [countryField, universityField, majorField, foodField],
  sponsor: [],
}

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

export const getApplicantFieldsForRole = (role: ApplicantRole) => [
  ...applicantCommonFields,
  ...sharedRoleFields[role],
  ...specificFields[role],
]
