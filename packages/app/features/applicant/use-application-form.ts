import { useState, useEffect, useCallback } from 'react'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import {
  getApplicantFieldsForRole,
  getApplicantRoleConfig,
  SECTIONS,
  dataReferences,
  type ApplicantField
} from './applicant-field-config'
import type { ApplicantRole, ApplicantFormData } from './applicant-types'

export type UseApplicationFormResult = {
  isLoading: boolean
  error: string | null
  fields: ApplicantField[]
  initialValues: Partial<ApplicantFormData>
  disabledFields: string[]
  status: string | null
  adminFeedback: string | null
  onSubmit: (data: ApplicantFormData) => Promise<void>
  onSaveDraft: (data: ApplicantFormData) => Promise<void>
  systemLinks: Record<string, { text: any; href: string }>
  isClosed: boolean
}

export function useApplicationForm(role: ApplicantRole, lang: string = 'en'): UseApplicationFormResult {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<ApplicantField[]>([])
  const [initialValues, setInitialValues] = useState<Partial<ApplicantFormData>>({})
  const [disabledFields, setDisabledFields] = useState<string[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null)
  const [systemLinks, setSystemLinks] = useState<Record<string, { text: any; href: string }>>({})
  const [isClosed, setIsClosed] = useState(false)

  // Fetch form configurations and user responses
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // FALLBACK PATH: If Supabase is not configured, load from static JSON files
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, using static configuration fallback.')
      const staticFields = getApplicantFieldsForRole(role)
      setFields(staticFields)
      setInitialValues({})
      setStatus(null)
      const staticRole = getApplicantRoleConfig(role)
      if (staticRole?.close_at) {
        setIsClosed(new Date(staticRole.close_at).getTime() < Date.now())
      } else {
        setIsClosed(false)
      }
      setIsLoading(false)
      return
    }

    try {
      // 1. Check user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User is not authenticated. Please log in first.')
      }

      // 2. Fetch application type fields ordered by display_order
      const { data: relationData, error: relError } = await supabase
        .from('application_type_fields')
        .select(`
          display_order,
          section_override_id,
          form_fields (
            id,
            field_type,
            is_required,
            text_content_type,
            label,
            placeholder,
            subtitle,
            validation_label,
            autocomplete_data_ref,
            content_ref,
            options,
            conditional_logic,
            ui_metadata,
            default_section_id
          )
        `)
        .eq('application_type_id', role)
        .order('display_order', { ascending: true })

      if (relError) throw relError
      if (!relationData || relationData.length === 0) {
        throw new Error(`No form fields configured for role: ${role}`)
      }

      // 3. Fetch form sections
      const { data: sectionsData, error: secError } = await supabase
        .from('form_sections')
        .select('id, label, display_order')

      if (secError) throw secError

      // 4. Fetch lookup data for autocomplete fields
      const lookupRefs = relationData
        .map((r: any) => r.form_fields?.autocomplete_data_ref)
        .filter(Boolean)

      const lookupMap: Record<string, any[]> = {}
      if (lookupRefs.length > 0) {
        const { data: lookups, error: lookupError } = await supabase
          .from('lookup_data')
          .select('category, options')
          .in('category', lookupRefs)

        if (lookupError) throw lookupError
        lookups?.forEach((item) => {
          lookupMap[item.category] = item.options
        })
      }

      // 5. Fetch system links for composite labels
      const { data: linksData, error: linksError } = await supabase
        .from('system_links')
        .select('id, text, href')

      if (linksError) throw linksError
      const linksMap: Record<string, { text: any; href: string }> = {}
      linksData?.forEach((link) => {
        linksMap[link.id] = { text: link.text, href: link.href }
      })
      setSystemLinks(linksMap)

      // 6. Fetch text blocks for content references (headers/paragraphs)
      const contentRefs = relationData
        .map((r: any) => r.form_fields?.content_ref)
        .filter(Boolean)

      const textBlocksMap: Record<string, any> = {}
      if (contentRefs.length > 0) {
        const { data: blocks, error: blocksError } = await supabase
          .from('text_blocks')
          .select('id, body')
          .in('id', contentRefs)

        if (blocksError) throw blocksError
        blocks?.forEach((block) => {
          textBlocksMap[block.id] = block.body
        })
      }

      // Helper function to resolve translated fields
      const getVal = (val: any) => {
        if (!val) return null
        if (typeof val === 'object' && val !== null) {
          // If it's a composite label definition, don't flatten the object structure yet
          if (val.type === 'composite' || val.parts) return val
          return val[lang] || val['en'] || val
        }
        return val
      }

      // Helper to translate composite label dictionaries if they contain translatable parts
      const getLabelVal = (val: any) => {
        if (!val) return null
        const labelObj = val[lang] || val['en'] || val
        if (typeof labelObj === 'object' && labelObj !== null && labelObj.type === 'composite') {
          return labelObj
        }
        return labelObj
      }

      // 7. Compile form fields schema
      const compiledFields: ApplicantField[] = relationData.map((rel: any) => {
        const field = rel.form_fields
        const sectionId = rel.section_override_id || field.default_section_id
        const section = sectionsData?.find((s) => s.id === sectionId)

        const uiMetadata = field.ui_metadata || {}
        const optionsRef = uiMetadata.optionsRef

        // Resolve options with translations
        let resolvedOptions = field.options?.map((opt: any) => ({
          label: getVal(opt.label),
          value: opt.value
        }))

        // Resolve options from static references (e.g. graduationYears) if not set in DB
        if (!resolvedOptions && optionsRef && dataReferences[optionsRef]) {
          resolvedOptions = dataReferences[optionsRef]
        }

        // Resolve text content for paragraphs from text_blocks
        let resolvedContent = null
        if (field.content_ref && textBlocksMap[field.content_ref]) {
          resolvedContent = getVal(textBlocksMap[field.content_ref])
        }

        return {
          name: field.id,
          fieldType: field.field_type,
          required: field.is_required,
          textContentType: field.text_content_type || undefined,
          label: getLabelVal(field.label),
          placeholder: getVal(field.placeholder) || '',
          subtitle: getVal(field.subtitle) || undefined,
          validationLabel: getVal(field.validation_label) || undefined,
          options: resolvedOptions || undefined,
          dependsOn: field.conditional_logic || undefined,
          autocompleteData: field.autocomplete_data_ref ? lookupMap[field.autocomplete_data_ref] : undefined,
          content: resolvedContent || undefined,
          section: section ? {
            id: section.id,
            label: getVal(section.label),
            order: section.display_order
          } : undefined,
          sectionKey: sectionId,
          ...uiMetadata // Spread multiple, layout, height, fileSelectorProps, etc.
        } as ApplicantField
      })
      setFields(compiledFields)

      // 8. Fetch user's profile details to prefill info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, gender, university, major, graduation_year, level_of_study, tshirt_size, dietary_restrictions, github, devpost, linkedin, personal_site, resume_url')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        console.warn('Failed to fetch user profile for prefilling fields:', profileError)
      }

      // Collect profile/auth values and track which ones are prefilled (non-empty)
      const profileValues: Record<string, string> = {}
      const disabled: string[] = []

      const firstNameVal = profileData?.first_name || user?.user_metadata?.first_name
      if (firstNameVal) {
        profileValues.firstName = firstNameVal
        disabled.push('firstName')
      }

      const lastNameVal = profileData?.last_name || user?.user_metadata?.last_name
      if (lastNameVal) {
        profileValues.lastName = lastNameVal
        disabled.push('lastName')
      }

      const emailVal = user?.email || user?.user_metadata?.email
      if (emailVal) {
        profileValues.email = emailVal
        disabled.push('email')
      }

      // Prefill phone from profiles first, fallback to user metadata (but do not disable so it remains editable)
      const phoneVal = profileData?.phone || user?.phone || user?.user_metadata?.phone
      if (phoneVal) {
        profileValues.phone = phoneVal
      }

      // Prefill other profile values
      if (profileData?.gender) profileValues.gender = profileData.gender
      if (profileData?.university) profileValues.university = profileData.university
      if (profileData?.major) profileValues.major = profileData.major
      if (profileData?.graduation_year) profileValues.year = profileData.graduation_year
      if (profileData?.level_of_study) profileValues.levelOfStudy = profileData.level_of_study
      if (profileData?.tshirt_size) profileValues.tshirt = profileData.tshirt_size
      if (profileData?.dietary_restrictions) profileValues.diet = profileData.dietary_restrictions
      if (profileData?.github) profileValues.github = profileData.github
      if (profileData?.devpost) profileValues.devpost = profileData.devpost
      if (profileData?.linkedin) profileValues.linkedin = profileData.linkedin
      if (profileData?.personal_site) profileValues.personalSite = profileData.personal_site
      if (profileData?.resume_url) profileValues.resume = profileData.resume_url

      setDisabledFields(disabled)

      // 9. Fetch user's existing application answers/status
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('answers, status, admin_feedback')
        .eq('application_type_id', role)
        .eq('user_id', user.id)
        .maybeSingle()

      if (appError) throw appError

      if (appData) {
        // Merge profile/auth prefilled values OVER existing draft answers to ensure they are never overridden by empty database draft entries
        setInitialValues({
          ...(appData.answers || {}),
          ...profileValues
        })
        setStatus(appData.status || null)
        setAdminFeedback(appData.admin_feedback || null)
      } else {
        setInitialValues(profileValues)
        setStatus(null)
        setAdminFeedback(null)
      }

      // Fetch role close_at
      let deadlineClosed = false
      const { data: typeData } = await supabase
        .from('application_types')
        .select('close_at')
        .eq('id', role)
        .maybeSingle()
      if (typeData?.close_at) {
        deadlineClosed = new Date(typeData.close_at).getTime() < Date.now()
      }
      setIsClosed(deadlineClosed)

    } catch (err: any) {
      console.error('Error loading Supabase configuration:', err)
      setError(err.message || 'Failed to load form configuration')
    } finally {
      setIsLoading(false)
    }
  }, [role, lang])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save full answers as draft
  const onSaveDraft = async (answers: ApplicantFormData) => {
    if (isClosed) {
      throw new Error('Registration has closed. You cannot save drafts.')
    }

    if (!isSupabaseConfigured) {
      console.log('Offline: Mock saving draft:', answers)
      setInitialValues(answers)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthenticated')

      const { error: saveError } = await supabase
        .from('applications')
        .upsert(
          {
            user_id: user.id,
            application_type_id: role,
            answers,
            status: 'draft',
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,application_type_id' }
        )

      if (saveError) throw saveError

      // Mirror core values to the user profiles table on draft save
      const getStr = (val: any) => typeof val === 'string' ? val : null

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: getStr(answers.firstName),
          last_name: getStr(answers.lastName),
          agree_mlh: Boolean(answers.privacyPolicy && answers.codeOfConduct),
          subscribe_mailing_list: Boolean(answers.mlhEmails),
          phone: getStr(answers.phone),
          gender: getStr(answers.gender),
          university: getStr(answers.university),
          major: getStr(answers.major),
          graduation_year: getStr(answers.year),
          level_of_study: getStr(answers.levelOfStudy),
          tshirt_size: getStr(answers.tshirt),
          dietary_restrictions: getStr(answers.diet),
          github: getStr(answers.github),
          devpost: getStr(answers.devpost),
          linkedin: getStr(answers.linkedin),
          personal_site: getStr(answers.personalSite),
          resume_url: getStr(answers.resume)
        })

      if (profileError) {
        console.warn('Failed to sync profile information on draft save:', profileError)
      }

      setStatus('draft')
      setInitialValues(answers)
      console.log('Draft saved successfully!')
    } catch (err) {
      console.error('Failed to save draft:', err)
      throw err
    }
  }

  // Submit final application answers
  const onSubmit = async (answers: ApplicantFormData) => {
    if (isClosed) {
      throw new Error('Registration has closed. You cannot submit applications.')
    }

    if (!isSupabaseConfigured) {
      console.log('Offline: Mock submitting application:', answers)
      setStatus('submitted')
      setInitialValues(answers)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthenticated')

      // 1. Save answers to applications table
      const { error: saveError } = await supabase
        .from('applications')
        .upsert(
          {
            user_id: user.id,
            application_type_id: role,
            answers,
            status: 'submitted',
            admin_feedback: null, // Reset feedback on submission
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,application_type_id' }
        )

      if (saveError) throw saveError

      // 2. Mirror core values to the user profiles table
      const getStr = (val: any) => typeof val === 'string' ? val : null

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: getStr(answers.firstName),
          last_name: getStr(answers.lastName),
          agree_mlh: Boolean(answers.privacyPolicy && answers.codeOfConduct),
          subscribe_mailing_list: Boolean(answers.mlhEmails),
          phone: getStr(answers.phone),
          gender: getStr(answers.gender),
          university: getStr(answers.university),
          major: getStr(answers.major),
          graduation_year: getStr(answers.year),
          level_of_study: getStr(answers.levelOfStudy),
          tshirt_size: getStr(answers.tshirt),
          dietary_restrictions: getStr(answers.diet),
          github: getStr(answers.github),
          devpost: getStr(answers.devpost),
          linkedin: getStr(answers.linkedin),
          personal_site: getStr(answers.personalSite),
          resume_url: getStr(answers.resume)
        })

      if (profileError) {
        console.warn('Failed to sync profile information:', profileError)
      }

      setStatus('submitted')
      setAdminFeedback(null)
      setInitialValues(answers)
      console.log('Application submitted successfully!')
    } catch (err) {
      console.error('Failed to submit application:', err)
      throw err
    }
  }

  return {
    isLoading,
    error,
    fields,
    initialValues,
    disabledFields,
    status,
    adminFeedback,
    onSubmit,
    onSaveDraft,
    systemLinks,
    isClosed
  }
}
