export type ApplicantRole = 'volunteer' | 'mentor' | 'hacker' | 'sponsor'

export interface ApplicantBase {
  firstName: string
  lastName: string
  email: string
  country: string
  university: string
  phone?: string,
  age?: number
  gender?: 'male' | 'female' | 'nonbinary' | 'prefer_not_to_answer' | ''
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
}

export interface SponsorApplicant extends ApplicantBase {
  company: string
  budget: string
  isHiddenSponsor?: boolean
}

export type ApplicantFormData = VolunteerApplicant | MentorApplicant | HackerApplicant | SponsorApplicant
