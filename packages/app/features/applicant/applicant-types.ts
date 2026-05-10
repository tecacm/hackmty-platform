export type ApplicantRole = 'volunteer' | 'mentor' | 'hacker' | 'sponsor'

export interface ApplicantBase {
  firstName: string
  lastName: string
  email: string
  country: string
  university: string
  phone?: string,
  age?: number
  year?: string
  resume?: string
  tshirt?: 'small' | 'medium' | 'large' | 'xlarge' | ''
  diet?: 'none' | 'vegetarian' | 'vegan' | 'no_pork' | 'gluten_free' | ''
  gender?: 'male' | 'female' | 'nonbinary' | 'prefer_not_to_answer' | ''
  firstHackathon?: 'yes' | 'no' | ''
  participatedRoles?: ('hacker' | 'mentor' | 'volunteer')[]
  studyingOrWorking?: 'yes' | 'no' | ''
  workPlace?: string
}

export interface VolunteerApplicant extends ApplicantBase {
  availability: string
  skills: string
}

export interface MentorApplicant extends ApplicantBase {
  company: string
  jobPosition: string
  mentorshipAreas: string
}

export interface HackerApplicant extends ApplicantBase {
  projectIdea: string
  github: string
  consentFoodAllergies?: boolean
}

export interface SponsorApplicant extends ApplicantBase {
  company: string
  budget: string
  isHiddenSponsor?: boolean
}

export type ApplicantFormData = VolunteerApplicant | MentorApplicant | HackerApplicant | SponsorApplicant
