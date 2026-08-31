import { useState, useEffect, useCallback, useRef } from 'react'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import {
  getApplicantFieldsForRole,
  getApplicantRoleConfig,
  SECTIONS,
  dataReferences,
  type ApplicantField
} from './applicant-field-config'
import { sanitizeFormData } from 'app/utils/sanitization'
import type { ApplicantRole, ApplicantFormData } from './applicant-types'

export type UseApplicationFormResult = {
  isLoading: boolean
  error: string | null
  fields: ApplicantField[]
  initialValues: Partial<ApplicantFormData>
  disabledFields: string[]
  status: string | null
  adminFeedback: string | null
  feedbackHistory: any[]
  onSubmit: (data: ApplicantFormData) => Promise<void>
  onSaveDraft: (data: ApplicantFormData) => Promise<void>
  onConfirmAttendance: () => Promise<void>
  systemLinks: Record<string, { text: any; href: string }>
  textBlocks: Record<string, string>
  isClosed: boolean
  confirmClosed: boolean
  confirmCloseAt: string | null
}

export function useApplicationForm(role: ApplicantRole, lang: string = 'en', inviteCode?: string | null): UseApplicationFormResult {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<ApplicantField[]>([])
  const [initialValues, setInitialValues] = useState<Partial<ApplicantFormData>>({})
  const [disabledFields, setDisabledFields] = useState<string[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null)
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([])
  const [systemLinks, setSystemLinks] = useState<Record<string, { text: any; href: string }>>({})
  const [textBlocks, setTextBlocks] = useState<Record<string, string>>({})
  const [isClosed, setIsClosed] = useState(false)
  const [confirmClosed, setConfirmClosed] = useState(false)
  const [confirmCloseAt, setConfirmCloseAt] = useState<string | null>(null)

  const activeRequestIdRef = useRef(0)

  // Fetch form configurations and user responses
  const loadData = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current
    const isCurrent = () => requestId === activeRequestIdRef.current

    setIsLoading(true)
    setError(null)

    // FALLBACK PATH: If Supabase is not configured, load from static JSON files
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, using static configuration fallback.')
      const staticFields = getApplicantFieldsForRole(role)
      if (!isCurrent()) return
      setFields(staticFields)
      setInitialValues({})
      setStatus(null)
      const staticRole = getApplicantRoleConfig(role)
      if (staticRole?.close_at) {
        setIsClosed(new Date(staticRole.close_at).getTime() < Date.now())
      } else {
        setIsClosed(false)
      }
      setConfirmClosed(false)
      setConfirmCloseAt(null)
      setIsLoading(false)
      return
    }

    try {
      // 1. Check user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!isCurrent()) return
      if (authError || !user) {
        throw new Error('User is not authenticated. Please log in first.')
      }

      // 2. Fetch role close_at and is_public flag
      let deadlineClosed = false
      let confirmDeadlineClosed = false
      let confirmCloseAtVal: string | null = null
      let isPublic = true
      const { data: typeData } = await supabase
        .from('application_types')
        .select('close_at, is_public, confirm_close_at')
        .eq('id', role)
        .maybeSingle()

      if (!isCurrent()) return
      if (typeData) {
        if (typeData.close_at) {
          deadlineClosed = new Date(typeData.close_at).getTime() < Date.now()
        }
        if (typeof typeData.is_public === 'boolean') {
          isPublic = typeData.is_public
        }
        if (typeData.confirm_close_at) {
          confirmCloseAtVal = typeData.confirm_close_at
          confirmDeadlineClosed = new Date(typeData.confirm_close_at).getTime() < Date.now()
        }
      }

      // 3. Verify invite code for hidden/restricted application types (e.g. sponsor, judge)
      if (!isPublic) {
        const cleanInvite = inviteCode?.trim()
        if (!cleanInvite) {
          throw new Error(`Restricted Role: A secret invite link or code is required to apply for ${role.toUpperCase()}. Please contact organizers for access.`)
        }

        const { data: inviteData, error: inviteErr } = await supabase
          .from('application_invite_codes')
          .select('*')
          .eq('code', cleanInvite)
          .maybeSingle()

        if (!isCurrent()) return
        if (inviteErr || !inviteData) {
          throw new Error('Invalid Secret Link: The invite code or link provided is invalid.')
        } else if (!inviteData.is_active) {
          throw new Error('Inactive Invite Link: This secret invite link has been deactivated.')
        } else if (inviteData.application_type_id !== role) {
          throw new Error(`Role Mismatch: This secret code is for ${inviteData.application_type_id.toUpperCase()} applications, not ${role.toUpperCase()}.`)
        } else if (inviteData.expires_at && new Date(inviteData.expires_at).getTime() < Date.now()) {
          throw new Error('Expired Invite Link: This secret invite link has expired.')
        } else if (inviteData.max_uses !== null && inviteData.use_count >= inviteData.max_uses) {
          throw new Error('Usage Limit Reached: This secret invite link has reached its maximum uses.')
        }
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

      if (!isCurrent()) return
      if (relError) throw relError
      if (!relationData || relationData.length === 0) {
        throw new Error(`No form fields configured for role: ${role}`)
      }

      // 3. Fetch form sections
      const { data: sectionsData, error: secError } = await supabase
        .from('form_sections')
        .select('id, label, display_order')

      if (!isCurrent()) return
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

        if (!isCurrent()) return
        if (lookupError) throw lookupError
        lookups?.forEach((item) => {
          lookupMap[item.category] = item.options
        })
      }

      // 5. Fetch system links for composite labels
      const { data: linksData, error: linksError } = await supabase
        .from('system_links')
        .select('id, text, href')

      if (!isCurrent()) return
      if (linksError) throw linksError
      const linksMap: Record<string, { text: any; href: string }> = {}
      linksData?.forEach((link) => {
        linksMap[link.id] = { text: link.text, href: link.href }
      })

      // 6. Fetch text blocks from Supabase
      const { data: blocks, error: blocksError } = await supabase
        .from('text_blocks')
        .select('id, body')

      if (!isCurrent()) return
      if (blocksError) throw blocksError

      const textBlocksMap: Record<string, any> = {}
      blocks?.forEach((block) => {
        textBlocksMap[block.id] = block.body
      })

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

        // Resolve fileSelectorProps directly from ui_metadata in DB response (with i18n support for message strings)
        let resolvedFileSelectorProps = uiMetadata.fileSelectorProps
        if (resolvedFileSelectorProps) {
          resolvedFileSelectorProps = {
            ...resolvedFileSelectorProps,
            invalidFileTypeMessage: getVal(resolvedFileSelectorProps.invalidFileTypeMessage) || undefined,
            invalidFileSizeMessage: getVal(resolvedFileSelectorProps.invalidFileSizeMessage) || undefined,
            fileSizeUnknownMessage: getVal(resolvedFileSelectorProps.fileSizeUnknownMessage) || undefined,
          }
        }

        // Resolve otherInputProps directly from ui_metadata in DB response (with i18n support)
        let resolvedOtherInputProps = uiMetadata.otherInputProps || uiMetadata.otherInput
        if (resolvedOtherInputProps) {
          resolvedOtherInputProps = {
            ...resolvedOtherInputProps,
            placeholder: getVal(resolvedOtherInputProps.placeholder) || resolvedOtherInputProps.placeholder,
            validationMessage: getVal(resolvedOtherInputProps.validationMessage) || resolvedOtherInputProps.validationMessage,
          }
        }

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
          ...uiMetadata,
          fileSelectorProps: resolvedFileSelectorProps || undefined,
          otherInputProps: resolvedOtherInputProps || undefined,
        } as ApplicantField
      })

      // 8. Fetch user's profile details to prefill info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, gender, university, major, graduation_year, level_of_study, tshirt_size, dietary_restrictions, github, devpost, linkedin, personal_site, resume_url')
        .eq('id', user.id)
        .maybeSingle()

      if (!isCurrent()) return
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

      // Prefill phone from profiles first, fallback to user metadata
      const phoneVal = profileData?.phone || user?.phone || user?.user_metadata?.phone
      if (phoneVal) {
        profileValues.phone = phoneVal
      }

      // Prefill other profile values (prefill for convenience, but keep editable)
      if (profileData?.gender) {
        profileValues.gender = profileData.gender
      }
      if (profileData?.university) {
        profileValues.university = profileData.university
      }
      if (profileData?.major) {
        profileValues.major = profileData.major
      }
      if (profileData?.graduation_year) {
        profileValues.year = profileData.graduation_year
      }
      if (profileData?.level_of_study) {
        profileValues.levelOfStudy = profileData.level_of_study
      }
      if (profileData?.tshirt_size) {
        profileValues.tshirt = profileData.tshirt_size
      }
      if (profileData?.dietary_restrictions) {
        profileValues.diet = profileData.dietary_restrictions
      }
      if (profileData?.github) {
        profileValues.github = profileData.github
      }
      if (profileData?.devpost) {
        profileValues.devpost = profileData.devpost
      }
      if (profileData?.linkedin) {
        profileValues.linkedin = profileData.linkedin
      }
      if (profileData?.personal_site) {
        profileValues.personalSite = profileData.personal_site
      }
      if (profileData?.resume_url) {
        profileValues.resume = profileData.resume_url
      }

      // 9. Fetch user's existing application answers/status
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('answers, status, admin_feedback')
        .eq('application_type_id', role)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!isCurrent()) return
      if (appError) throw appError

      // Extract active feedback from JSONB array
      const getActiveFeedback = (feedbackVal: any): string | null => {
        if (!feedbackVal) return null
        if (typeof feedbackVal === 'string') return feedbackVal
        if (Array.isArray(feedbackVal)) {
          const active = feedbackVal.find(f => !f.resolved_at)
          return active ? active.feedback : null
        }
        return null
      }

      // Batch set state values when we know this is the latest call
      const resolvedBlocks: Record<string, string> = {}
      blocks?.forEach((block) => {
        const val = getVal(block.body)
        resolvedBlocks[block.id] = typeof val === 'string' ? val : ''
      })
      setTextBlocks(resolvedBlocks)
      setSystemLinks(linksMap)
      setFields(compiledFields)
      setDisabledFields(disabled)
      if (appData) {
        // Merge profile/auth prefilled values OVER existing draft answers to ensure they are never overridden by empty database draft entries
        setInitialValues({
          ...(appData.answers || {}),
          ...profileValues
        })
        setStatus(appData.status || null)
        setAdminFeedback(getActiveFeedback(appData.admin_feedback))
        setFeedbackHistory(Array.isArray(appData.admin_feedback) ? appData.admin_feedback : [])
      } else {
        let newStatus: string | null = null
        if (Object.keys(profileValues).length > 0) {
          try {
            const { error: saveDraftError } = await supabase
              .from('applications')
              .upsert(
                {
                  user_id: user.id,
                  application_type_id: role,
                  answers: profileValues,
                  status: 'draft',
                  updated_at: new Date().toISOString()
                },
                { onConflict: 'user_id,application_type_id' }
              )
            if (!saveDraftError) {
              newStatus = 'draft'
            }
          } catch (draftErr) {
            console.warn('Failed to auto-create draft on load:', draftErr)
          }
        }
        setInitialValues(profileValues)
        setStatus(newStatus)
        setAdminFeedback(null)
        setFeedbackHistory([])
      }
      setIsClosed(deadlineClosed)
      setConfirmClosed(confirmDeadlineClosed)
      setConfirmCloseAt(confirmCloseAtVal)
      setIsLoading(false)

    } catch (err: any) {
      if (!isCurrent()) return
      console.error('Error loading Supabase configuration:', err)
      setError(err.message || 'Failed to load form configuration')
      setIsLoading(false)
    }
  }, [role, lang, inviteCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save full answers as draft
  const onSaveDraft = async (rawAnswers: ApplicantFormData) => {
    const answers = sanitizeFormData(rawAnswers)
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
  const onSubmit = async (rawAnswers: ApplicantFormData) => {
    const answers = sanitizeFormData(rawAnswers)
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

      // Fetch current application to get existing feedback history
      const { data: existingApp } = await supabase
        .from('applications')
        .select('admin_feedback')
        .eq('user_id', user.id)
        .eq('application_type_id', role)
        .maybeSingle()

      let updatedFeedback: any[] = []
      if (existingApp && Array.isArray(existingApp.admin_feedback)) {
        updatedFeedback = existingApp.admin_feedback.map((f: any) => 
          !f.resolved_at ? { ...f, resolved_at: new Date().toISOString() } : f
        )
      } else if (existingApp && typeof existingApp.admin_feedback === 'string' && existingApp.admin_feedback) {
        updatedFeedback = [{
          feedback: existingApp.admin_feedback,
          requested_at: new Date().toISOString(),
          resolved_at: new Date().toISOString()
        }]
      }

      // 1. Save answers to applications table
      const { error: saveError } = await supabase
        .from('applications')
        .upsert(
          {
            user_id: user.id,
            application_type_id: role,
            answers,
            status: 'submitted',
            admin_feedback: updatedFeedback,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,application_type_id' }
        )

      if (saveError) throw saveError

      // Increment invite code usage count if an invite code was used
      if (inviteCode?.trim() && isSupabaseConfigured) {
        try {
          const cleanInvite = inviteCode.trim()
          const { data: inv } = await supabase.from('application_invite_codes').select('use_count').eq('code', cleanInvite).maybeSingle()
          if (inv) {
            await supabase.from('application_invite_codes').update({
              use_count: (inv.use_count || 0) + 1,
              last_used_at: new Date().toISOString()
            }).eq('code', cleanInvite)
          }
        } catch (err) {
          console.warn('Failed to increment invite code usage count:', err)
        }
      }

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
      setFeedbackHistory(updatedFeedback)
      setInitialValues(answers)
      console.log('Application submitted successfully!')
    } catch (err) {
      console.error('Failed to submit application:', err)
      throw err
    }
  }

  const onConfirmAttendance = useCallback(async () => {
    if (!isSupabaseConfigured) {
      console.log('Offline: Mock confirming attendance')
      setStatus('confirmed')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Unauthenticated')

      // Enforce this role's confirmation deadline (defense-in-depth with the UI gate).
      const { data: typeRow } = await supabase
        .from('application_types')
        .select('confirm_close_at')
        .eq('id', role)
        .maybeSingle()
      if (typeRow?.confirm_close_at && new Date(typeRow.confirm_close_at).getTime() < Date.now()) {
        throw new Error('Attendance confirmation has closed.')
      }

      // Update status to 'confirmed' and confirmed_at to now
      const { error: confirmErr } = await supabase
        .from('applications')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('application_type_id', role)

      if (confirmErr) throw confirmErr

      const currentYear = new Date().getFullYear().toString()

      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: role,
          event_year: currentYear
        })

      if (roleErr && roleErr.code !== '23505') {
        console.warn(`Failed to insert user role ${role}:`, roleErr)
      }

      // Remove the basic 'user' candidate role for this year
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('role', 'user')
        .eq('event_year', currentYear)

      setStatus('confirmed')
    } catch (err: any) {
      console.error('Failed to confirm attendance:', err)
      throw err
    }
  }, [role])

  return {
    isLoading,
    error,
    fields,
    initialValues,
    disabledFields,
    status,
    adminFeedback,
    feedbackHistory,
    onSubmit,
    onSaveDraft,
    onConfirmAttendance,
    systemLinks,
    textBlocks,
    isClosed,
    confirmClosed,
    confirmCloseAt
  }
}
