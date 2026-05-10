
import { ApplicantRole } from './applicant-types'
import React, { type ReactNode } from 'react'
import { Text } from 'react-native'
import { TextLink } from 'solito/link'
import countries from 'app/data/static/countries.json'
import universities from 'app/data/static/universities.json'
import majors from 'app/data/static/degrees.json'
import type { FileSelectorProps } from 'app/components/styled-file-input'
import { formFieldColors } from 'app/components/form-field-styles'

const currentYear = new Date().getFullYear()
const graduationYearOptions = Array.from({ length: 6 }, (_, index) => {
  const year = currentYear - 1 + index
  return { label: String(year), value: String(year) }
})

export const SECTIONS = {
  PERSONAL_INFO: { id: 'Personal Info', label: 'Personal Info', order: 0 },
  HACKATHONS: { id: 'Hackathons', label: 'Hackathons', order: 10 },
  TRAVELING: { id: 'Traveling', label: 'Traveling', order: 20 },
  SHOW_BUILT: { id: "Show us what you've built", label: "Show us what you've built", order: 30 },
  POLICIES: { id: 'HackMTY Policies', label: 'HackMTY Policies', order: 999 },
} as const

type SectionRef = string | { id: string; label?: string; order?: number }

type ApplicantFormField = {
  name: string
  label: string | ReactNode
  validationLabel?: string
  placeholder: string
  textContentType?: string
  required?: boolean
  section?: SectionRef
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

const yearField: ApplicantField = {
  name: 'year',
  label: 'What is your graduation year?',
  validationLabel: 'Graduation year',
  placeholder: 'Select graduation year',
  textContentType: 'none',
  required: true,
  section: SECTIONS.PERSONAL_INFO,
  subtitle: 'Choose your expected graduation year.',
  fieldType: 'segmented',
  options: graduationYearOptions,
}

const tshirtField: ApplicantField = {
  name: 'tshirt',
  label: 'What\'s your T-Shirt Size?',
  validationLabel: 'T-Shirt Size',
  placeholder: 'medium',
  textContentType: 'none',
  required: true,
  section: SECTIONS.PERSONAL_INFO,
  fieldType: 'select',
  options: [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
    { label: 'Extra Large', value: 'xlarge' },
  ],
}

const foodField: ApplicantField = {
  name: 'diet',
  label: 'Dietary Restrictions',
  validationLabel: 'Dietary Restrictions',
  placeholder: 'none',
  textContentType: 'none',
  required: true,
  section: SECTIONS.PERSONAL_INFO,
  fieldType: 'select',
  options: [
    { label: 'None', value: 'none' },
    { label: 'Vegetarian', value: 'vegetarian' },
    { label: 'Vegan', value: 'vegan' },
    { label: 'No pork', value: 'no_pork' },
    { label: 'Gluten-Free', value: 'gluten_free' },
  ],
}

const levelOfStudy: ApplicantField = {
  name: 'levelOfStudy',
  label: 'Level of Study',
  validationLabel: 'Level of Study',
  placeholder: 'Select level of study',
  textContentType: 'none',
  required: true,
  section: SECTIONS.PERSONAL_INFO,
  fieldType: 'select',
  options: [
    { label: 'Less than Secondary / High School', value: 'less_than_secondary' },
    { label: 'Secondary / High School', value: 'secondary' },
    { label: 'Undergraduate (2 year - community college or similar)', value: 'undergraduate_2_year' },
    { label: 'Undergraduate (3+ year)', value: 'undergraduate_3_year' },
    { label: 'Graduate University (Masters, Professional, Doctoral, etc)', value: 'graduate' },
    { label: 'Code School / Bootcamp', value: 'code_school' },
    { label: 'Other Vocational / Trade Program or Apprenticeship', value: 'other_vocational' },
    { label: 'Post Doctorate', value: 'post_doctorate' },
    { label: 'Other', value: 'other' },
    { label: 'I\'m not currently a student', value: 'not_a_student' },
  ],
}

const universityField: ApplicantField = {
  name: 'university',
  label: 'What university do you attend?',
  validationLabel: 'University',
  subtitle: 'Current or most recent school you attended.',
  placeholder: 'Enter university',
  required: true,
  section: SECTIONS.PERSONAL_INFO,
  fieldType: 'autocomplete',
  autocompleteData: universities,
}

const majorField: ApplicantField = {
  name: 'major',
  label: 'What\'s your major/degree?',
  validationLabel: 'Major',
  subtitle: 'Current or most recent major you are pursuing.',
  placeholder: 'Enter major',
  required: true,
  section: SECTIONS.PERSONAL_INFO,
  fieldType: 'autocomplete',
  autocompleteData: majors,
}

const countryField: ApplicantField = {
  name: 'country',
  label: 'From which country are you joining us?',
  validationLabel: 'Country',
  placeholder: 'Enter country',
  textContentType: 'addressCity',
  subtitle: 'Please select one of the autocomplete options or write \'Others\'.',
  required: true,
  section: SECTIONS.TRAVELING,
  fieldType: 'autocomplete',
  autocompleteData: countries,
}

const cityField: ApplicantField = {
  name: 'city',
  label: 'From which city are you joining us?',
  validationLabel: 'City',
  placeholder: 'Enter city',
  textContentType: 'addressCity',
  required: true,
  section: SECTIONS.TRAVELING,
  fieldType: 'text'
}


const github: ApplicantField = {
  name: 'github',
  label: 'GitHub',
  validationLabel: 'GitHub',
  placeholder: 'GitHub profile URL',
  required: false,
  section: SECTIONS.SHOW_BUILT,
  fieldType: 'text'
}


const devpost: ApplicantField = {
  name: 'devpost',
  label: 'Devpost',
  validationLabel: 'Devpost',
  placeholder: 'Devpost profile URL',
  required: false,
  section: SECTIONS.SHOW_BUILT,
  fieldType: 'text'
}

const linkedin: ApplicantField = {
  name: 'linkedin',
  label: 'LinkedIn',
  validationLabel: 'LinkedIn',
  placeholder: 'LinkedIn profile URL',
  required: false,
  section: SECTIONS.SHOW_BUILT,
  fieldType: 'text'
}

const personalSite: ApplicantField = {
  name: 'personalSite',
  label: 'Personal Website',
  validationLabel: 'Personal Website',
  placeholder: 'Personal website URL',
  required: false,
  section: SECTIONS.SHOW_BUILT,
  fieldType: 'text'
}

const personalInfoDivider: ApplicantDividerField = {
  name: 'personal_info_divider',
  fieldType: 'divider',
  section: SECTIONS.PERSONAL_INFO,
}

const resumeField: ApplicantField = {
  name: 'resume',
  label: 'Resume / CV',
  validationLabel: 'Resume',
  placeholder: 'Upload your resume',
  required: true,
  section: SECTIONS.SHOW_BUILT,
  subtitle: 'Accepted format: PDF only. Max size: 5 MB',
  fieldType: 'file',
  fileSelectorProps: {
    acceptedMimeTypes: ['application/pdf'],
    acceptedExtensions: ['pdf'],
    maxSizeBytes: 5 * 1024 * 1024,
    invalidFileTypeMessage: 'Resume must be a PDF.',
    invalidFileSizeMessage: 'Resume must be 5 MB or smaller.',
    fileSizeUnknownMessage: 'Resume size could not be verified. Please choose another PDF.',
  },
}

const foodAllergiesField: ApplicantField = {
  name: 'consentFoodAllergies',
  label: 'I authorize HackMTY the use of my food allergies and intolerances data for the sole purpose of managing the catering service',
  placeholder: '',
  required: true,
  fieldType: 'checkbox',
  section: SECTIONS.POLICIES
}

const codeOfConductField: ApplicantField = {
  name: 'codeOfConduct',
  label: React.createElement(
    Text,
    { style: { color: formFieldColors.titleText } },
    "I've read, understand and accept the",
    ' ',
    React.createElement(
      TextLink,
      { href: 'https://mlh.io/code-of-conduct', style: { color: '#c2b75f', textDecorationLine: 'underline' }, children: 'MLH Code of Conduct' }
    )
  ),
  placeholder: '',
  required: true,
  fieldType: 'checkbox',
  section: SECTIONS.POLICIES
}

const mlhPrivacyPolicy = React.createElement(
  TextLink,
  { href: 'https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md', style: { color: '#c2b75f', textDecorationLine: 'underline' }, children: 'MLH Privacy Policy' }
)

const privacyPolicyField: ApplicantField = {
  name: 'privacyPolicy',
  label: React.createElement(
    Text,
    { style: { color: formFieldColors.titleText, }},
    "I authorize you to share my application/registration information with Major League Hacking for event administration, ranking, and MLH administration in-line with the ",
    mlhPrivacyPolicy,
    '. I further agree to the terms of both the ',
    React.createElement(
      TextLink,
      { href: 'https://github.com/MLH/mlh-policies/blob/main/contest-terms.md', style: { color: '#c2b75f', textDecorationLine: 'underline' }, children: 'MLH Contest Terms and Conditions' }
    ),
    ' and the ',
    mlhPrivacyPolicy,
    '.'
  ),
  placeholder: '',
  required: true,
  fieldType: 'checkbox',
  section: SECTIONS.POLICIES
}

const yesNoOptions = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
]

const firstHackathonField: ApplicantField = {
  name: 'firstHackathon',
  label: 'Is this your First Hackathon?',
  placeholder: '',
  required: true,
  fieldType: 'radio',
  options: yesNoOptions,
  section: SECTIONS.HACKATHONS,
}

const nightShiftsField: ApplicantField = {
  name: 'nightShifts',
  label: 'Would you be ok doing nightshifts?',
  placeholder: '',
  subtitle: 'We have lots of fun events during the night, but we also need volunteers to help us out during those hours.',
  required: true,
  fieldType: 'radio',
  options: yesNoOptions,
  section: SECTIONS.HACKATHONS,
}

const participatedRolesField: ApplicantField = {
  name: 'participatedRoles',
  label: 'Did you participate as a hacker, mentor, or volunteer?',
  placeholder: '',
  required: true,
  fieldType: 'radio',
  multiple: true,
  options: [
    { label: 'Hacker', value: 'hacker' },
    { label: 'Mentor', value: 'mentor' },
    { label: 'Volunteer', value: 'volunteer' },
  ],
  section: SECTIONS.HACKATHONS,
  dependsOn: { field: 'firstHackathon', value: 'no' },
}

const daysToAttendField: ApplicantField = {
  name: 'daysToAttend',
  label: 'Which days will you be attending HackMTY?',
  placeholder: '',
  required: true,
  fieldType: 'radio',
  multiple: true,
  options: [
    { label: 'Friday', value: 'friday' },
    { label: 'Saturday', value: 'saturday' },
    { label: 'Sunday', value: 'sunday' },
  ],
  section: SECTIONS.HACKATHONS,
}

const englishConfidenceField: ApplicantField = {
  name: 'englishConfidence',
  label: 'How confident are you speaking English?',
  placeholder: '',
  required: true,
  fieldType: 'radio',
  layout: 'horizontal-wrap',
  options: [
    { label: '1', value: 'one' },
    { label: '2', value: 'two' },
    { label: '3', value: 'three' },
    { label: '4', value: 'four' },
    { label: '5', value: 'five' },
  ],
  section: SECTIONS.HACKATHONS,
}

const mlhEmailsField: ApplicantField = {
  name: 'mlhEmails',
  label: 'I authorize MLH to send me occasional emails about relevant events, career opportunities, and community announcements.',
  placeholder: '',
  required: false,
  fieldType: 'checkbox',
  section: SECTIONS.POLICIES
}

const studyingOrWorkingField: ApplicantField = {
  name: 'studyingOrWorking',
  label: 'Are you studying or working?',
  placeholder: '',
  required: true,
  fieldType: 'radio',
  options: [
    { label: 'Working', value: 'working' },
    { label: 'Studying', value: 'studying' },
  ],
  section: SECTIONS.PERSONAL_INFO,
}

const workPlaceField: ApplicantField = {
  name: 'workPlace',
  label: 'Where are you working?',
  placeholder: 'Enter company or institution',
  required: true,
  fieldType: 'text',
  section: SECTIONS.PERSONAL_INFO,
  dependsOn: { field: 'studyingOrWorking', value: 'working' },
}

const policiesHeader: ApplicantParagraphField = {
  fieldType: 'paragraph',
  section: SECTIONS.POLICIES,
  content: `We, at HackMTY, process your provided information in order to organize the best possible hackathon. This may also include images and videos featuring you during the event. Your data will be preliminarily used for admissions, and any images or videos may be used for marketing and archiving. For more information on the processing of your personal data and on how to exercise your rights of access, rectification, suppression, limitation, portability and opposition please visit our Privacy and Cookies Policy.`
}


export const applicantCommonFields: ApplicantField[] = [
  { name: 'firstName', label: 'First Name', placeholder: 'Enter first name', textContentType: 'name', required: true, section: SECTIONS.PERSONAL_INFO },
  { name: 'lastName', label: 'Last Name', placeholder: 'Enter last name', textContentType: 'familyName', required: true, section: SECTIONS.PERSONAL_INFO },
  { name: 'email', label: 'Email', placeholder: 'Enter email', textContentType: 'emailAddress', required: true, section: SECTIONS.PERSONAL_INFO },
  { name: 'phone', label: 'Phone', placeholder: '+#########', textContentType: 'telephoneNumber', required: true, section: SECTIONS.PERSONAL_INFO, subtitle: 'Phone number must be entered in the format: +#########. Up to 15 digits allowed.' },
  { name: 'age', label: 'Age', placeholder: 'Age as of date of HackMTY', textContentType: 'none', required: true, section: SECTIONS.PERSONAL_INFO,subtitle: 'Enter your age in years as will be on the date of the event. We will not store your exact birth date, only an inferred year.'},
  { name: 'gender', label: 'What gender do you identify with?', validationLabel: 'Gender', placeholder: 'Select gender', textContentType: 'none', required: true, section: SECTIONS.PERSONAL_INFO, subtitle: 'This is for demographic purposes. Select "Prefer not to answer" if you do not want to disclose.', fieldType: 'select', options: [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'nonbinary' },
    { label: 'Prefer not to answer', value: 'prefer_not_to_answer' },
  ]},
  personalInfoDivider,
  policiesHeader
]

const sharedRoleFields: Record<ApplicantRole, ApplicantField[]> = {
  volunteer: [countryField, cityField, universityField, majorField, yearField, levelOfStudy, tshirtField, foodField, foodAllergiesField, codeOfConductField, firstHackathonField, participatedRolesField],
  hacker: [countryField, cityField, universityField, majorField, yearField, levelOfStudy, tshirtField, foodField, foodAllergiesField, codeOfConductField, firstHackathonField, participatedRolesField, privacyPolicyField, mlhEmailsField],
  mentor: [countryField, cityField, universityField, majorField, yearField, levelOfStudy, foodField, foodAllergiesField, codeOfConductField, firstHackathonField, participatedRolesField],
  sponsor: [],
}

export const specificFields: Record<ApplicantRole, ApplicantField[]> = {
  volunteer: [
    daysToAttendField,
    nightShiftsField,
    englishConfidenceField
  ],
  mentor: [
    studyingOrWorkingField,
    workPlaceField,
    privacyPolicyField,
    mlhEmailsField,
  ],
  hacker: [
    {name: 'excited', label: 'What are you most excited about for HackMTY?', placeholder: 'Your answer here', required: true, fieldType: 'text', section: SECTIONS.HACKATHONS, height: 100},
    {name: 'projects', label: 'What projects have you worked on?', placeholder: 'Your answer here', required: false, fieldType: 'text', section: SECTIONS.HACKATHONS, height: 100},
    github,
    linkedin,
    devpost,
    personalSite,
    resumeField
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
