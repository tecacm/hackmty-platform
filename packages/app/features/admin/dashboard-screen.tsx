import { useState, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native'
import { PillButton } from '../../components/pill-button'
import { AdminTabBar } from './components/AdminTabBar'
import { SubmissionsTab } from './components/SubmissionsTab'
import { UserDirectoryTab } from './components/UserDirectoryTab'
import { RolesAccessTab } from './components/RolesAccessTab'
import { FormBuilderTab } from './components/FormBuilderTab'
import { UserEditModal } from './components/UserEditModal'
import { CreateRoleModal } from './components/CreateRoleModal'
import { AddFieldModal } from './components/AddFieldModal'
import { SecretInviteModal } from './components/SecretInviteModal'
import { DirectMessageModal } from './components/DirectMessageModal'
import { AppIcon } from 'app/components/app-icon'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'

interface Application {
  id: string
  status: string
  admin_feedback: string | null
  application_type_id: string
  answers: Record<string, any>
  user_id: string
  profiles: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    team_id: string | null
    teams: {
      id: string
      name: string
    } | null
  } | null
}

const previewText = (value: any): string => {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const translated = value.en || Object.values(value)[0]
  if (typeof translated === 'string') return translated
  return translated?.parts?.map((part: any) => part.content || '').join('') || ''
}

const DASHBOARD_CACHE_KEY = 'hackmty_admin_dashboard_state'

let memoryStateCache: Record<string, any> = {}

function getStoredDashboardState(): Record<string, any> {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(DASHBOARD_CACHE_KEY)
      if (raw) return JSON.parse(raw)
    } catch (e) {
      // ignore
    }
  }
  return memoryStateCache
}

function saveStoredDashboardState(state: Record<string, any>) {
  memoryStateCache = { ...memoryStateCache, ...state }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(memoryStateCache))
    } catch (e) {
      // ignore
    }
  }
}

export function AdminDashboardScreen() {
  const { navigateTo } = useSmartNavigate()
  const { hasPermission, loading: permissionsLoading } = useUserPermissions()
  const hasViewOthersPermission = !permissionsLoading && hasPermission('applications', 'view_others')
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const initialCache = getStoredDashboardState()

  useEffect(() => {
    setIsReady(true)
  }, [])

  // Direct Message Modal State
  const [messageModalState, setMessageModalState] = useState<{
    visible: boolean
    targetType: 'team' | 'user'
    targetId: string
    targetName: string
    memberUserIds?: string[]
  }>({
    visible: false,
    targetType: 'user',
    targetId: '',
    targetName: '',
  })

  const openMessageModal = (targetType: 'team' | 'user', targetId: string, targetName: string, memberUserIds?: string[]) => {
    setMessageModalState({
      visible: true,
      targetType,
      targetId,
      targetName,
      memberUserIds,
    })
  }

  // Pagination State
  const [appPage, setAppPage] = useState<number>(initialCache.appPage || 1)
  const [appPageSize, setAppPageSize] = useState<number>(initialCache.appPageSize || 20)
  const [userPage, setUserPage] = useState<number>(initialCache.userPage || 1)
  const [userPageSize, setUserPageSize] = useState<number>(initialCache.userPageSize || 20)

  // User Directory State
  const [usersList, setUsersList] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState<string>(initialCache.userSearchQuery || '')
  const [userRoleFilter, setUserRoleFilter] = useState<string>(initialCache.userRoleFilter || 'all')

  // User Edit Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editUniversity, setEditUniversity] = useState('')
  const [editMajor, setEditMajor] = useState('')
  const [editRoles, setEditRoles] = useState<string[]>(['user'])
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [resetEmailSentUser, setResetEmailSentUser] = useState<string | null>(null)

  const toggleEditRole = (role: string) => {
    setEditRoles(prev => {
      if (prev.includes(role)) {
        const updated = prev.filter(r => r !== role)
        return updated.length > 0 ? updated : ['user']
      } else {
        return [...prev, role]
      }
    })
  }
  // Primary Admin Tab State
  const [adminTab, setAdminTab] = useState<'applications' | 'users' | 'roles' | 'forms'>(initialCache.adminTab || 'applications')

  // Roles & Access Management State
  const [rolesList, setRolesList] = useState<any[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [permissionsList, setPermissionsList] = useState<any[]>([])
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>({})
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false)
  const [newRoleId, setNewRoleId] = useState('')
  const [newRoleLabel, setNewRoleLabel] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [newRolePublic, setNewRolePublic] = useState(true)
  const [newRoleCloseAt, setNewRoleCloseAt] = useState('')
  const [isCreatingRole, setIsCreatingRole] = useState(false)

  // Form Builder & Fields State
  const [selectedFormRole, setSelectedFormRole] = useState('hacker')
  const [formFieldsList, setFormFieldsList] = useState<any[]>([])
  const [formSectionsList, setFormSectionsList] = useState<any[]>([])
  const [allFormFields, setAllFormFields] = useState<any[]>([])
  const [formBuilderLoading, setFormBuilderLoading] = useState(false)
  const [formDraftActions, setFormDraftActions] = useState<any[]>([])
  const [formDraftSaving, setFormDraftSaving] = useState(false)
  const [showAddFieldModal, setShowAddFieldModal] = useState(false)
  const [newFieldId, setNewFieldId] = useState('')
  const [newFieldLabelTranslations, setNewFieldLabelTranslations] = useState<Array<{ key: string; value: string }>>([{ key: 'en', value: '' }])
  const [newFieldSubtitleTranslations, setNewFieldSubtitleTranslations] = useState<Array<{ key: string; value: string }>>([{ key: 'en', value: '' }])
  const [newFieldSubtitleRich, setNewFieldSubtitleRich] = useState(false)
  const [newFieldConditionField, setNewFieldConditionField] = useState('')
  const [newFieldConditionOperator, setNewFieldConditionOperator] = useState('==')
  const [newFieldConditionValue, setNewFieldConditionValue] = useState('')
  const [newFieldUiMetadata, setNewFieldUiMetadata] = useState('{}')
  const [newFieldOptions, setNewFieldOptions] = useState<Array<{ value: string; translations: Array<{ key: string; value: string }> }>>([])
  const [newFieldType, setNewFieldType] = useState('text')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [newFieldSection, setNewFieldSection] = useState('')
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [isAddingField, setIsAddingField] = useState(false)

  const fetchRolesList = async () => {
    if (!isSupabaseConfigured) return
    setRolesLoading(true)
    try {
      const { data, error } = await supabase
        .from('application_types')
        .select('*')
        .order('id')

      if (error) throw error
      setRolesList(data || [])
    } catch (err: any) {
      console.warn('Failed to fetch roles list:', err)
    } finally {
      setRolesLoading(false)
    }
  }

  const fetchRolePermissions = async () => {
    if (!isSupabaseConfigured) return
    try {
      const [{ data: permissions, error: permissionsError }, { data: mappings, error: mappingsError }] = await Promise.all([
        supabase.from('permissions').select('id, feature, action, description').order('feature').order('action'),
        supabase.from('role_permissions').select('role, permission_id'),
      ])
      if (permissionsError) throw permissionsError
      if (mappingsError) throw mappingsError
      const map: Record<string, string[]> = {}
      mappings?.forEach((mapping) => { (map[mapping.role] ||= []).push(mapping.permission_id) })
      setPermissionsList(permissions || [])
      setRolePermissionsMap(map)
    } catch (err) { console.warn('Failed to fetch role permissions:', err) }
  }

  const handleUpdateRolePermissions = async (role: string, permissionIds: string[]) => {
    if (!isSupabaseConfigured) return
    const previous = rolePermissionsMap[role] || []
    setRolePermissionsMap((map) => ({ ...map, [role]: permissionIds }))
    try {
      const { error: deleteError } = await supabase.from('role_permissions').delete().eq('role', role)
      if (deleteError) throw deleteError
      if (permissionIds.length) {
        const { error: insertError } = await supabase.from('role_permissions').insert(permissionIds.map((permission_id) => ({ role, permission_id })))
        if (insertError) throw insertError
      }
    } catch (err: any) {
      setRolePermissionsMap((map) => ({ ...map, [role]: previous }))
      alert('Failed to update permissions: ' + err.message)
    }
  }

  const handleToggleRoleVisibility = async (roleId: string, currentPublic: boolean) => {
    if (!isSupabaseConfigured) return
    try {
      const { error } = await supabase
        .from('application_types')
        .update({ is_public: !currentPublic })
        .eq('id', roleId)

      if (error) throw error
      fetchRolesList()
    } catch (err: any) {
      alert('Failed to update role visibility: ' + err.message)
    }
  }

  const handleUpdateRoleDeadline = async (roleId: string, closeAt: string | null) => {
    if (!isSupabaseConfigured) return
    try {
      const { error } = await supabase
        .from('application_types')
        .update({ close_at: closeAt })
        .eq('id', roleId)

      if (error) throw error
      fetchRolesList()
    } catch (err: any) {
      alert('Failed to update role deadline: ' + err.message)
    }
  }

  const handleCreateRole = async () => {
    if (!newRoleId.trim() || !newRoleLabel.trim() || !isSupabaseConfigured) return
    setIsCreatingRole(true)
    try {
      const cleanId = newRoleId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      const { error } = await supabase
        .from('application_types')
        .insert({
          id: cleanId,
          label: newRoleLabel.trim(),
          description: newRoleDesc.trim(),
          is_public: newRolePublic,
          close_at: newRoleCloseAt.trim() || null
        })

      if (error) throw error
      setShowCreateRoleModal(false)
      setNewRoleId('')
      setNewRoleLabel('')
      setNewRoleDesc('')
      setNewRoleCloseAt('')
      fetchRolesList()
    } catch (err: any) {
      alert('Failed to create role: ' + err.message)
    } finally {
      setIsCreatingRole(false)
    }
  }

  const fetchFormSchema = async (roleId: string) => {
    if (!isSupabaseConfigured) return
    setFormBuilderLoading(true)
    try {
      const { data: relData, error: relError } = await supabase
        .from('application_type_fields')
        .select(`
          application_type_id,
          field_id,
          display_order,
          section_override_id,
          form_fields (
            id,
            label,
            field_type,
            text_content_type,
            is_required,
            placeholder,
            subtitle,
            options,
            conditional_logic,
            ui_metadata,
            default_section_id
          )
        `)
        .eq('application_type_id', roleId)
        .order('display_order')

      if (relError) throw relError

      const { data: fieldsData, error: fieldsErr } = await supabase
        .from('form_fields')
        .select('*')

      if (fieldsErr) throw fieldsErr

      const { data: sectionsData } = await supabase
        .from('form_sections')
        .select('*')
        .order('display_order')

      const mappedFields: any[] = (relData || []).map((rel, idx) => {
        const fieldDef: any = (Array.isArray(rel.form_fields)
          ? rel.form_fields[0] || {}
          : rel.form_fields || {})
        const labelRaw = fieldDef.label
        const labelStr = typeof labelRaw === 'object' && labelRaw !== null
          ? (typeof labelRaw.en === 'string' ? labelRaw.en : String(Object.values(labelRaw)[0] ?? rel.field_id))
          : String(labelRaw ?? rel.field_id)
        return {
          relId: `${rel.application_type_id}|${rel.field_id}`,
          fieldId: rel.field_id,
          displayOrder: rel.display_order ?? idx,
          sectionId: rel.section_override_id || fieldDef.default_section_id || 'general',
          label: labelStr,
          type: fieldDef.field_type || 'text',
          fieldTypeFull: fieldDef.field_type || 'text',
          textContentType: fieldDef.text_content_type || null,
          required: !!fieldDef.is_required,
          placeholder: fieldDef.placeholder,
          subtitle: fieldDef.subtitle,
          options: fieldDef.options,
          conditionalLogic: fieldDef.conditional_logic,
          uiMetadata: fieldDef.ui_metadata,
        }
      })

      setFormFieldsList(mappedFields)
      setFormSectionsList((sectionsData || []).sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)))
      setAllFormFields(fieldsData || [])
      setFormDraftActions([])
    } catch (err: any) {
      console.warn('Failed to fetch form schema:', err)
    } finally {
      setFormBuilderLoading(false)
    }
  }

  const resetFieldEditor = () => {
    setEditingFieldId(null)
    setNewFieldId('')
    setNewFieldLabelTranslations([{ key: 'en', value: '' }])
    setNewFieldSubtitleTranslations([{ key: 'en', value: '' }])
    setNewFieldSubtitleRich(false)
    setNewFieldConditionField('')
    setNewFieldConditionOperator('==')
    setNewFieldConditionValue('')
    setNewFieldUiMetadata('{}')
    setNewFieldOptions([])
    setNewFieldType('text')
    setNewFieldRequired(false)
    setNewFieldSection('')
  }

  const handleOpenFieldEditor = (fieldId: string) => {
    const field = allFormFields.find((item) => item.id === fieldId)
    if (!field) return
    const translations = (value: any) => Object.entries(value || {}).map(([key, translated]) => ({
      key,
      value: typeof translated === 'string' ? translated : (translated as any)?.parts?.map((part: any) => part.content || '').join('') || '',
    })).filter((translation) => translation.value) || [{ key: 'en', value: '' }]
    const fieldTranslations = translations(field.label)
    const subtitleTranslations = translations(field.subtitle)
    if (!fieldTranslations.length) fieldTranslations.push({ key: 'en', value: '' })
    if (!subtitleTranslations.length) subtitleTranslations.push({ key: 'en', value: '' })
    setEditingFieldId(field.id)
    setNewFieldId(field.id)
    setNewFieldLabelTranslations(fieldTranslations)
    setNewFieldSubtitleTranslations(subtitleTranslations)
    setNewFieldSubtitleRich(!!field.subtitle?.en?.parts || !!field.subtitle?.es?.parts)
    setNewFieldConditionField(field.conditional_logic?.field || '')
    setNewFieldConditionOperator(field.conditional_logic?.operator || '==')
    setNewFieldConditionValue(field.conditional_logic?.value === undefined ? '' : String(field.conditional_logic.value))
    setNewFieldUiMetadata(JSON.stringify(field.ui_metadata || {}, null, 2))
    setNewFieldOptions((field.options || []).map((option: any) => ({
      value: option.value || '',
      translations: translations(option.label),
    })))
    setNewFieldType(field.field_type || 'text')
    setNewFieldRequired(!!field.is_required)
    setNewFieldSection(field.default_section_id || '')
    setShowAddFieldModal(true)
  }

  const handleAddFieldToRole = async () => {
    if (!newFieldId.trim() || !newFieldLabelTranslations.some((translation) => translation.key.trim() && translation.value.trim()) || !isSupabaseConfigured) return
    setIsAddingField(true)
    try {
      const cleanFieldId = newFieldId.trim().replace(/[^a-zA-Z0-9_]/g, '')
      const localized = (translations: Array<{ key: string; value: string }>) => Object.fromEntries(translations.filter((translation) => translation.key.trim() && translation.value.trim()).map((translation) => [translation.key.trim(), translation.value.trim()]))
      const richLocalized = (translations: Array<{ key: string; value: string }>) => {
        const rich = (content: string) => ({ type: 'composite', parts: [{ type: 'text', content }] })
        return Object.fromEntries(translations.filter((translation) => translation.key.trim() && translation.value.trim()).map((translation) => [translation.key.trim(), rich(translation.value.trim())]))
      }
      const options = newFieldOptions
        .filter((option) => option.value.trim() && option.translations.some((translation) => translation.key.trim() && translation.value.trim()))
        .map((option) => ({ value: option.value.trim(), label: localized(option.translations) }))
      let uiMetadata: Record<string, any>
      try {
        uiMetadata = newFieldUiMetadata.trim() ? JSON.parse(newFieldUiMetadata) : {}
      } catch {
        throw new Error('Advanced properties must be valid JSON.')
      }
      const conditionalLogic = newFieldConditionField.trim()
        ? { field: newFieldConditionField.trim(), operator: newFieldConditionOperator, value: /^-?\d+(\.\d+)?$/.test(newFieldConditionValue.trim()) ? Number(newFieldConditionValue) : newFieldConditionValue.trim() }
        : null

      const fieldPatch = { id: cleanFieldId, label: localized(newFieldLabelTranslations), field_type: newFieldType, is_required: newFieldRequired, default_section_id: newFieldSection || null, subtitle: newFieldSubtitleTranslations.some((translation) => translation.value.trim()) ? (newFieldSubtitleRich ? richLocalized(newFieldSubtitleTranslations) : localized(newFieldSubtitleTranslations)) : null, options: ['select', 'multiselect', 'radio', 'segmented'].includes(newFieldType) ? options : null, conditional_logic: conditionalLogic, ui_metadata: uiMetadata }
      setAllFormFields((previous) => [...previous.filter((field) => field.id !== cleanFieldId), fieldPatch])
      if (editingFieldId) {
        setFormFieldsList((previous) => previous.map((field) => field.fieldId === cleanFieldId ? { ...field, label: previewText(fieldPatch.label), type: fieldPatch.field_type, required: fieldPatch.is_required, sectionId: fieldPatch.default_section_id || 'general', subtitle: fieldPatch.subtitle, options: fieldPatch.options } : field))
      } else {
        setFormFieldsList((previous) => [...previous, { relId: `${selectedFormRole}|${cleanFieldId}`, fieldId: cleanFieldId, displayOrder: previous.length + 1, sectionId: fieldPatch.default_section_id || 'general', label: previewText(fieldPatch.label), type: fieldPatch.field_type, required: fieldPatch.is_required, subtitle: fieldPatch.subtitle, options: fieldPatch.options }])
      }
      setFormDraftActions((previous) => [...previous.filter((action) => action.type !== 'field' || action.field.id !== cleanFieldId), { type: 'field', field: fieldPatch }, ...(editingFieldId ? [] : [{ type: 'attach', fieldId: cleanFieldId, sectionOverrideId: null }])])

      setShowAddFieldModal(false)
      resetFieldEditor()
    } catch (err: any) {
      alert('Failed to add field: ' + err.message)
    } finally {
      setIsAddingField(false)
    }
  }

  const handleRemoveFieldFromRole = async (relId: string) => {
    if (!isSupabaseConfigured) return
    const sepIdx = relId.indexOf('|')
    const appTypeId = relId.slice(0, sepIdx)
    const fieldId = relId.slice(sepIdx + 1)
    setFormFieldsList((previous) => previous.filter((field) => field.relId !== relId))
    setFormDraftActions((previous) => [...previous, { type: 'remove', applicationTypeId: appTypeId, fieldId }])
  }

  const handleReorderField = async (relId: string, direction: 'up' | 'down') => {
    if (!isSupabaseConfigured) return
    const sorted = [...formFieldsList].sort((a, b) => a.displayOrder - b.displayOrder)
    const idx = sorted.findIndex(f => f.relId === relId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const current = sorted[idx]!
    const swap = sorted[swapIdx]!
    const aOrder = current.displayOrder
    const bOrder = swap.displayOrder
    setFormFieldsList(prev => prev.map(f => {
      if (f.relId === current.relId) return { ...f, displayOrder: bOrder }
      if (f.relId === swap.relId) return { ...f, displayOrder: aOrder }
      return f
    }))
    setFormDraftActions((previous) => [...previous, { type: 'reorder' }])
  }

  const handleAttachExistingField = async (fieldId: string, sectionOverrideId: string | null) => {
    if (!isSupabaseConfigured) return
    const field = allFormFields.find((item) => item.id === fieldId)
    if (!field) return
    setFormFieldsList((previous) => [...previous, { relId: `${selectedFormRole}|${fieldId}`, fieldId, displayOrder: previous.length + 1, sectionId: sectionOverrideId || field.default_section_id || 'general', label: previewText(field.label), type: field.field_type, required: !!field.is_required, subtitle: field.subtitle, options: field.options }])
    setFormDraftActions((previous) => [...previous, { type: 'attach', fieldId, sectionOverrideId }])
  }

  const handleAddSection = async (sectionId: string, sectionLabel: Record<string, string>) => {
    if (!isSupabaseConfigured) return
    try {
      setFormSectionsList((previous) => [...previous.filter((section) => section.id !== sectionId), { id: sectionId, label: sectionLabel, display_order: previous.length }])
      setFormDraftActions((previous) => [...previous, { type: 'section', section: { id: sectionId, label: sectionLabel } }])
    } catch (err: any) {
      console.warn('Add section failed:', err)
      setFormSectionsList(prev => [...prev, { id: sectionId, label: sectionLabel }])
    }
  }

  const discardFormDraft = () => fetchFormSchema(selectedFormRole)
  const applyFormDraft = async () => {
    if (!isSupabaseConfigured || !formDraftActions.length) return
    setFormDraftSaving(true)
    try {
      for (const action of formDraftActions.filter((item) => item.type === 'section')) { const { error } = await supabase.from('form_sections').upsert(action.section); if (error) throw error }
      for (const action of formDraftActions.filter((item) => item.type === 'field')) { const { error } = await supabase.from('form_fields').upsert(action.field); if (error) throw error }
      for (const action of formDraftActions.filter((item) => item.type === 'remove')) { const { error } = await supabase.from('application_type_fields').delete().eq('application_type_id', action.applicationTypeId).eq('field_id', action.fieldId); if (error) throw error }
      for (const action of formDraftActions.filter((item) => item.type === 'attach')) { const field = formFieldsList.find((item) => item.fieldId === action.fieldId); const { error } = await supabase.from('application_type_fields').upsert({ application_type_id: selectedFormRole, field_id: action.fieldId, display_order: field?.displayOrder || formFieldsList.length, section_override_id: action.sectionOverrideId }, { onConflict: 'application_type_id,field_id' }); if (error) throw error }
      for (const field of formFieldsList) { const { error } = await supabase.from('application_type_fields').update({ display_order: field.displayOrder }).eq('application_type_id', selectedFormRole).eq('field_id', field.fieldId); if (error) throw error }
      fetchFormSchema(selectedFormRole)
    } catch (err: any) { alert('Failed to apply form changes: ' + err.message) } finally { setFormDraftSaving(false) }
  }

  const fetchUsersDirectory = async () => {
    if (!isSupabaseConfigured) return
    setUsersLoading(true)
    try {
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profErr) throw profErr

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role, event_year')

      const { data: appsData } = await supabase
        .from('applications')
        .select('user_id, application_type_id, status, answers')

      const { data: directoryEmails, error: directoryEmailsError } = await supabase
        .rpc('get_admin_directory_emails')
      if (directoryEmailsError) console.warn('Could not load auth emails:', directoryEmailsError.message)
      const emailMap: Record<string, string> = {}
      directoryEmails?.forEach((entry: any) => { if (entry.user_id && entry.email) emailMap[entry.user_id] = entry.email })

      const rolesMap: Record<string, string[]> = {}
      rolesData?.forEach(r => {
        if (!r.user_id) return
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = []
        rolesMap[r.user_id]!.push(r.role)
      })

      const appsMap: Record<string, Array<{ type: string; status: string; answers: Record<string, any> }>> = {}
      appsData?.forEach(a => {
        if (!a.user_id) return
        if (!appsMap[a.user_id]) appsMap[a.user_id] = []
        appsMap[a.user_id]!.push({ type: a.application_type_id, status: a.status, answers: a.answers || {} })
      })

      const formattedUsers = (profiles || []).map(p => {
        const uRoles = rolesMap[p.id] || ['user']
        const uApps = appsMap[p.id] || []
        const emailFromApplication = uApps.map((app) => app.answers?.email).find((email) => typeof email === 'string' && email)
        const email = emailMap[p.id] || emailFromApplication || 'No email recorded'

        return {
          ...p,
          email,
          roles: uRoles,
          primaryRole: uRoles[0] || 'user',
          applications: uApps,
        }
      })

      setUsersList(formattedUsers)
    } catch (err: any) {
      console.warn('Failed to fetch users directory:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user)
    setEditFirstName(user.first_name || '')
    setEditLastName(user.last_name || '')
    setEditEmail(user.email || '')
    setEditPhone(user.phone || '')
    setEditUniversity(user.university || '')
    setEditMajor(user.major || '')
    setEditRoles(Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : ['user'])
  }

  const handleSaveUserChanges = async () => {
    if (!editingUser || !isSupabaseConfigured) return
    setIsSavingUser(true)
    try {
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          phone: editPhone.trim(),
          university: editUniversity.trim(),
          major: editMajor.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)

      if (profErr) throw profErr

      const currentYear = new Date().getFullYear().toString()
      await supabase.from('user_roles').delete().eq('user_id', editingUser.id)

      const roleInserts = editRoles.map(r => ({
        user_id: editingUser.id,
        role: r,
        event_year: currentYear
      }))

      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert(roleInserts)

      if (roleErr) throw roleErr

      setEditingUser(null)
      fetchUsersDirectory()
    } catch (err: any) {
      alert('Failed to save user changes: ' + err.message)
    } finally {
      setIsSavingUser(false)
    }
  }

  const handleSendPasswordReset = async (email: string, userId: string) => {
    if (!isSupabaseConfigured || !email || email === 'No email recorded') {
      alert('A valid email address is required to send a password reset.')
      return
    }
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://experience.hackmty.com'
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      })
      if (error) throw error
      setResetEmailSentUser(userId)
      setTimeout(() => setResetEmailSentUser(null), 3000)
    } catch (err: any) {
      alert('Failed to send password reset email: ' + err.message)
    }
  }

  const [searchQuery, setSearchQuery] = useState<string>(initialCache.searchQuery || '')
  const [selectedType, setSelectedType] = useState<string>(initialCache.selectedType || 'all')
  const [dbTypes, setDbTypes] = useState<Array<{ id: string; label: string }>>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>(initialCache.selectedCountries || [])
  const [selectedStatus, setSelectedStatus] = useState<string>(initialCache.selectedStatus || 'all')

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCodesList, setInviteCodesList] = useState<any[]>([])
  const [isInviteLoading, setIsInviteLoading] = useState(false)
  const [newInviteRole, setNewInviteRole] = useState('sponsor')
  const [newInviteLabel, setNewInviteLabel] = useState('')
  const [newInviteMaxUses, setNewInviteMaxUses] = useState('')
  const [newInviteExpiresAt, setNewInviteExpiresAt] = useState('')
  const [isCreatingInvite, setIsCreatingInvite] = useState(false)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)

  const fetchInviteCodes = async () => {
    if (!isSupabaseConfigured) return
    setIsInviteLoading(true)
    try {
      const { data, error } = await supabase
        .from('application_invite_codes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setInviteCodesList(data || [])
    } catch (err: any) {
      console.warn('Failed to fetch invite codes:', err)
    } finally {
      setIsInviteLoading(false)
    }
  }

  const handleCreateInviteCode = async () => {
    if (!isSupabaseConfigured) return
    setIsCreatingInvite(true)
    const prefix = newInviteRole === 'sponsor' ? 'sp' : newInviteRole === 'judge' ? 'jdg' : 'inv'
    const randomSlug = Math.random().toString(36).substring(2, 8)
    const code = `${prefix}-${randomSlug}`
    const maxUses = newInviteMaxUses.trim() ? parseInt(newInviteMaxUses.trim(), 10) : null

    try {
      const { error } = await supabase
        .from('application_invite_codes')
        .insert({
          code,
          application_type_id: newInviteRole,
          label: newInviteLabel.trim() || `${newInviteRole.toUpperCase()} Secret Link`,
          is_active: true,
          max_uses: isNaN(maxUses as any) ? null : maxUses
        })
      if (error) throw error
      setNewInviteLabel('')
      setNewInviteMaxUses('')
      fetchInviteCodes()
    } catch (err: any) {
      alert('Failed to generate invite link: ' + err.message)
    } finally {
      setIsCreatingInvite(false)
    }
  }

  const handleToggleInviteActive = async (id: string, currentActive: boolean) => {
    if (!isSupabaseConfigured) return
    try {
      await supabase
        .from('application_invite_codes')
        .update({ is_active: !currentActive })
        .eq('id', id)
      fetchInviteCodes()
    } catch (err: any) {
      alert('Failed to update status: ' + err.message)
    }
  }

  const handleDeleteInvite = async (id: string) => {
    if (!isSupabaseConfigured) return
    try {
      await supabase.from('application_invite_codes').delete().eq('id', id)
      fetchInviteCodes()
    } catch (err: any) {
      alert('Failed to delete invite code: ' + err.message)
    }
  }

  const copyInviteLink = (code: string, role: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://experience.hackmty.com'
    const fullUrl = `${origin}/application?role=${role}&invite=${code}`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl)
    }
    setCopiedCodeId(id)
    setTimeout(() => setCopiedCodeId(null), 2000)
  }
  const [includeInput, setIncludeInput] = useState<string>('')
  const [includeTags, setIncludeTags] = useState<string[]>(initialCache.includeTags || [])

  const addIncludeTag = (text?: string) => {
    const target = typeof text === 'string' ? text : includeInput
    if (!target || typeof target !== 'string') return
    const parts = target.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length > 0) {
      setIncludeTags(prev => {
        const next = [...prev]
        parts.forEach(p => {
          if (!next.includes(p)) next.push(p)
        })
        return next
      })
    }
    setIncludeInput('')
  }

  const removeIncludeTag = (tagToRemove: string) => {
    setIncludeTags(prev => prev.filter(t => t !== tagToRemove))
  }

  const [excludeInput, setExcludeInput] = useState<string>('')
  const [excludeTags, setExcludeTags] = useState<string[]>(initialCache.excludeTags || [])

  const addExcludeTag = (text?: string) => {
    const target = typeof text === 'string' ? text : excludeInput
    if (!target || typeof target !== 'string') return
    const parts = target.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length > 0) {
      setExcludeTags(prev => {
        const next = [...prev]
        parts.forEach(p => {
          if (!next.includes(p)) next.push(p)
        })
        return next
      })
    }
    setExcludeInput('')
  }

  const removeExcludeTag = (tagToRemove: string) => {
    setExcludeTags(prev => prev.filter(t => t !== tagToRemove))
  }

  const [groupByTeams, setGroupByTeams] = useState<boolean>(initialCache.groupByTeams ?? false)

  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>(initialCache.expandedTeams || {})

  const toggleTeamExpand = (teamName: string) => {
    setExpandedTeams(prev => ({ ...prev, [teamName]: !prev[teamName] }))
  }

  const { height: screenHeight, width: screenWidth } = useWindowDimensions()
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    setHasMounted(true)
  }, [])
  const isSmallScreen = hasMounted && screenWidth > 0 && screenWidth < 768
  const fetchApplications = async () => {
    try {
      setError(null)
      setLoading(true)

      if (!isSupabaseConfigured) {
        setApps(mockApplications)
        setLoading(false)
        return
      }

      const { data: appsData, error: fetchErr } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          admin_feedback,
          application_type_id,
          answers,
          user_id,
          profiles (
            id,
            first_name,
            last_name,
            team_id
          )
        `)

      if (fetchErr) throw fetchErr

      const { data: teamProfilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, team_id')
        .not('team_id', 'is', null)

      const { data: typesData } = await supabase
        .from('application_types')
        .select('id, label')

      if (typesData) {
        setDbTypes(typesData.map((t: any) => {
          let lbl = t.id
          if (typeof t.label === 'object' && t.label !== null) {
            lbl = t.label.en || t.id
          } else if (typeof t.label === 'string') {
            lbl = t.label
          }
          return { id: t.id, label: lbl }
        }))
      }

      const { data: teamsData, error: teamsErr } = await supabase
        .from('teams')
        .select('id, name')

      if (teamsErr) {
        console.warn('Failed to fetch teams mapping in Admin Portal:', teamsErr)
      }

      const teamsMap = new Map((teamsData || []).map((t: any) => [t.id, t.name]))
      const appUserIds = new Set((appsData || []).map((app: any) => app.user_id))

      const formatted = (appsData || []).map((app: any) => {
        const teamId = app.profiles?.team_id
        const teamName = teamId ? teamsMap.get(teamId) : null

        const getActiveFeedback = (feedbackVal: any): string | null => {
          if (!feedbackVal) return null
          if (typeof feedbackVal === 'string') return feedbackVal
          if (Array.isArray(feedbackVal)) {
            const active = feedbackVal.find(f => !f.resolved_at)
            return active ? active.feedback : null
          }
          return null
        }

        return {
          ...app,
          admin_feedback: getActiveFeedback(app.admin_feedback),
          profiles: app.profiles ? {
            ...app.profiles,
            email: app.answers?.email || 'No email provided',
            teams: teamId && teamName ? { id: teamId, name: teamName } : null
          } : null
        }
      })

      if (teamProfilesData) {
        teamProfilesData.forEach((prof: any) => {
          if (prof.id && !appUserIds.has(prof.id)) {
            const teamName = prof.team_id ? teamsMap.get(prof.team_id) : null
            formatted.push({
              id: `no-app-${prof.id}`,
              status: 'not_started',
              application_type_id: 'hacker',
              user_id: prof.id,
              answers: {
                firstName: prof.first_name || 'Team',
                lastName: prof.last_name || 'Member',
                email: 'No application started',
              },
              profiles: {
                id: prof.id,
                first_name: prof.first_name,
                last_name: prof.last_name,
                team_id: prof.team_id,
                teams: prof.team_id && teamName ? { id: prof.team_id, name: teamName } : null,
              }
            })
          }
        })
      }

      setApps(formatted)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasViewOthersPermission) {
      fetchApplications()
    }
  }, [hasViewOthersPermission])

  const dynamicTypeOptions = useMemo(() => {
    const optionsMap = new Map<string, string>()
    optionsMap.set('all', 'ALL TYPES')
    dbTypes.forEach(t => {
      optionsMap.set(t.id, t.label.toUpperCase())
    })
    apps.forEach(app => {
      if (app.application_type_id && !optionsMap.has(app.application_type_id)) {
        optionsMap.set(app.application_type_id, app.application_type_id.toUpperCase())
      }
    })
    return Array.from(optionsMap.entries()).map(([id, label]) => ({ id, label }))
  }, [dbTypes, apps])

  const filteredUsers = useMemo(() => {
    return usersList.filter(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      const email = (user.email || '').toLowerCase()
      const id = (user.id || '').toLowerCase()
      const university = (user.university || '').toLowerCase()
      const matchesSearch = 
        fullName.includes(userSearchQuery.toLowerCase()) ||
        email.includes(userSearchQuery.toLowerCase()) ||
        id.includes(userSearchQuery.toLowerCase()) ||
        university.includes(userSearchQuery.toLowerCase())
      const matchesRole = userRoleFilter === 'all' || user.roles.includes(userRoleFilter)
      return matchesSearch && matchesRole
    })
  }, [usersList, userSearchQuery, userRoleFilter])

  useEffect(() => {
    saveStoredDashboardState({
      adminTab,
      groupByTeams,
      appPage,
      appPageSize,
      searchQuery,
      selectedType,
      selectedStatus,
      selectedCountries,
      includeTags,
      excludeTags,
      userPage,
      userPageSize,
      userSearchQuery,
      userRoleFilter,
      expandedTeams,
    })
  }, [
    adminTab,
    groupByTeams,
    appPage,
    appPageSize,
    searchQuery,
    selectedType,
    selectedStatus,
    selectedCountries,
    includeTags,
    excludeTags,
    userPage,
    userPageSize,
    userSearchQuery,
    userRoleFilter,
    expandedTeams,
  ])

  const isFirstAppPageRender = useRef(true)
  useEffect(() => {
    if (isFirstAppPageRender.current) {
      isFirstAppPageRender.current = false
      return
    }
    setAppPage(1)
  }, [searchQuery, selectedType, selectedCountries, selectedStatus, excludeTags, includeTags, groupByTeams])

  useEffect(() => {
    setUserPage(1)
  }, [userSearchQuery, userRoleFilter])

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      // Filter out draft and not_started applications in individual view
      if (!groupByTeams && (app.status === 'draft' || app.status === 'not_started' || app.id.startsWith('no-app-'))) {
        return false
      }

      const firstName = app.profiles?.first_name || app.answers?.firstName || ''
      const lastName = app.profiles?.last_name || app.answers?.lastName || ''
      const fullName = `${firstName} ${lastName}`.toLowerCase()
      const email = app.answers?.email || ''
      const university = app.answers?.university || ''
      const city = app.answers?.city || ''
      const matchesSearch = 
        fullName.includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        city.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedType === 'all' || app.application_type_id === selectedType
      const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(app.answers?.country)
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus
      const checkTagMatch = (tag: string) => {
        const queryStr = tag.toLowerCase().trim()
        const country = String(app.answers?.country || '').toLowerCase()
        const major = String(app.answers?.major || '').toLowerCase()
        const fullContentStr = `${fullName} ${email} ${university} ${city} ${country} ${major} ${JSON.stringify(app.answers || {})}`.toLowerCase()
        if (queryStr.includes(':')) {
          const parts = queryStr.split(':')
          const prefix = (parts[0] || '').trim()
          const val = (parts[1] || '').trim()
          if (prefix === 'university' || prefix === 'uni' || prefix === 'school') {
            return university.toLowerCase().includes(val)
          } else if (prefix === 'city') {
            return city.toLowerCase().includes(val)
          } else if (prefix === 'country') {
            return country.includes(val)
          } else if (prefix === 'major') {
            return major.includes(val)
          } else if (prefix === 'status') {
            return String(app.status || '').toLowerCase().includes(val)
          } else if (prefix === 'role' || prefix === 'type') {
            return (app.application_type_id || '').toLowerCase().includes(val)
          }
          return fullContentStr.includes(val)
        }
        return fullContentStr.includes(queryStr)
      }
      let matchesExclude = true
      if (excludeTags.length > 0) {
        for (const tag of excludeTags) {
          if (checkTagMatch(tag)) {
            matchesExclude = false
            break
          }
        }
      }
      let matchesInclude = true
      if (includeTags.length > 0) {
        for (const tag of includeTags) {
          if (!checkTagMatch(tag)) {
            matchesInclude = false
            break
          }
        }
      }
      return matchesSearch && matchesType && matchesCountry && matchesStatus && matchesExclude && matchesInclude
    })
  }, [apps, searchQuery, selectedType, selectedCountries, selectedStatus, includeTags, excludeTags, groupByTeams])

  const groupedData = useMemo(() => {
    if (!groupByTeams) return []
    const teamMap: Record<string, { teamName: string; applications: Application[] }> = {}
    const individual: Application[] = []
    filteredApps.forEach(app => {
      const team = app.profiles?.teams
      const isHacker = app.application_type_id === 'hacker'
      if (isHacker && team && team.id && team.name) {
        const teamId = team.id
        if (!teamMap[teamId]) {
          teamMap[teamId] = { teamName: team.name, applications: [] }
        }
        teamMap[teamId]!.applications.push(app)
      } else {
        individual.push(app)
      }
    })
    const result = Object.values(teamMap).sort((a, b) => a.teamName.localeCompare(b.teamName))
    if (individual.length > 0) {
      result.push({ teamName: 'Individual Applicants (No Team)', applications: individual })
    }
    return result
  }, [filteredApps, groupByTeams])

  const totalAppPages = useMemo(() => {
    if (groupByTeams) {
      return Math.ceil(groupedData.length / appPageSize) || 1
    }
    return Math.ceil(filteredApps.length / appPageSize) || 1
  }, [groupByTeams, groupedData, filteredApps, appPageSize])

  const displayedApps = useMemo(() => {
    const start = (appPage - 1) * appPageSize
    return filteredApps.slice(start, start + appPageSize)
  }, [filteredApps, appPage, appPageSize])

  const totalUserPages = Math.ceil(filteredUsers.length / userPageSize) || 1
  const displayedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize
    return filteredUsers.slice(start, start + userPageSize)
  }, [filteredUsers, userPage, userPageSize])

  const stats = useMemo(() => {
    const total = apps.length
    const accepted = apps.filter(app => app.status === 'accepted').length
    const rejected = apps.filter(app => app.status === 'rejected').length
    const changes = apps.filter(app => app.status === 'changes_requested').length
    const submitted = apps.filter(app => app.status === 'submitted').length
    return { total, accepted, rejected, changes, submitted }
  }, [apps])

  if (!isReady) return <View style={[styles.container]} />

  if (permissionsLoading) {
    return (
      <View style={[styles.centerContainer]}>
        <ActivityIndicator size="large" color="#c2b75f" />
      </View>
    )
  }

  if (!hasPermission('applications', 'view_others')) {
    return (
      <View style={[styles.centerContainer]}>
        <View style={styles.accessDeniedCard}>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtitle}>
            You do not have administrative permissions to review application documents.
          </Text>
          <PillButton
            title="Return Home"
            onPress={() => navigateTo('/home')}
            additionalStyle={{ width: 200, height: 50, marginTop: 10 }}
          />
        </View>
      </View>
    )
  }

  const renderStatusBadge = (status: string) => {
    let bgColor = 'rgba(255,255,255,0.08)'
    let textColor = '#e1e1e1'
    let label = status.toUpperCase()
    if (status === 'accepted') { bgColor = 'rgba(16, 185, 129, 0.15)'; textColor = '#10b981'; label = 'ACCEPTED' }
    else if (status === 'rejected') { bgColor = 'rgba(239, 68, 68, 0.15)'; textColor = '#ef4444'; label = 'REJECTED' }
    else if (status === 'changes_requested') { bgColor = 'rgba(245, 158, 11, 0.15)'; textColor = '#f59e0b'; label = 'CHANGES REQ' }
    else if (status === 'submitted') { bgColor = 'rgba(59, 130, 246, 0.15)'; textColor = '#3b82f6'; label = 'SUBMITTED' }
    else if (status === 'draft') { bgColor = 'rgba(156, 163, 175, 0.15)'; textColor = '#9ca3af'; label = 'DRAFT' }
    else if (status === 'not_started') { bgColor = 'rgba(203, 213, 225, 0.25)'; textColor = '#64748b'; label = 'NOT STARTED' }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusBadgeText, { color: textColor }]}>{label}</Text>
      </View>
    )
  }

  const renderApplicationRow = (app: Application) => {
    const firstName = app.profiles?.first_name || app.answers?.firstName || 'Unknown'
    const lastName = app.profiles?.last_name || app.answers?.lastName || 'Applicant'
    const fullName = `${firstName} ${lastName}`
    const email = app.answers?.email || 'No email'
    const country = app.answers?.country || 'N/A'
    const university = app.answers?.university || 'N/A'
    const roleType = app.application_type_id || 'hacker'

    const isNonInteractive = app.status === 'draft' || app.status === 'not_started' || app.id.startsWith('no-app-')

    return (
      <View key={app.id} style={styles.appCard}>
        <Pressable
          disabled={isNonInteractive}
          onPress={() => {
            if (!isNonInteractive) {
              navigateTo(`/users/${app.user_id}?appId=${app.id}`)
            }
          }}
          style={[styles.appHeaderRow, isNonInteractive && { opacity: 0.85, cursor: 'default' as any }]}
        >
          <View style={styles.headerMainInfo}>
            <Text style={styles.applicantName}>{fullName}</Text>
            <Text style={styles.applicantEmail}>{email}</Text>
          </View>
          <View style={styles.headerSubInfo}>
            <View style={styles.tagRow}>
              <View style={[styles.typeBadge, { borderColor: roleType === 'hacker' ? '#c2b75f' : '#b284be' }]}>
                <Text style={[styles.typeBadgeText, { color: roleType === 'hacker' ? '#c2b75f' : '#b284be' }]}>
                  {roleType.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.countryTag}>{country}</Text>
            </View>
            <Text style={styles.universityText} numberOfLines={1}>{university}</Text>
          </View>
          <View style={[styles.headerStatusInfo, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            {renderStatusBadge(app.status)}
            {app.user_id ? (
              <Pressable
                onPress={(e: any) => {
                  if (typeof e?.stopPropagation === 'function') e.stopPropagation()
                  openMessageModal('user', app.user_id, fullName)
                }}
                style={{
                  backgroundColor: '#f3e8ff',
                  borderColor: '#c084fc',
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <AppIcon name="mail" size={12} color="#7e22ce" />
                <Text style={{ color: '#7e22ce', fontSize: 11, fontWeight: '700' }}>Msg</Text>
              </Pressable>
            ) : null}
            {!isNonInteractive ? (
              <AppIcon name="chevron.right" size={14} color="#6d28d9" />
            ) : (
              <AppIcon name="ban" size={14} color="#94a3b8" />
            )}
          </View>
        </Pressable>
      </View>
    )
  }

  const renderPaginationBar = (
    currentPage: number,
    totalPages: number,
    pageSize: number,
    totalItems: number,
    onPageChange: (page: number) => void,
    onPageSizeChange: (size: number) => void
  ) => {
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    return (
      <View style={[styles.paginationCard, isSmallScreen && { flexDirection: 'column', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 }]}>
        <Text style={[styles.paginationInfoText, isSmallScreen && { textAlign: 'center' }]}>
          Showing {startItem}–{endItem} of {totalItems} entries
        </Text>

        <View style={[styles.paginationControlsRow, isSmallScreen && { flexDirection: 'column', alignItems: 'center', width: '100%', gap: 12 }]}>
          {/* Row 1: Page Size Selector (Centered) */}
          <View style={[styles.pageSizeSelector, isSmallScreen && { justifyContent: 'center', width: '100%' }]}>
            <Text style={styles.pageSizeLabel}>Rows:</Text>
            {[10, 20, 50, 100].map(sz => (
              <Pressable
                key={sz}
                onPress={() => { onPageSizeChange(sz); onPageChange(1); }}
                style={[styles.pageSizeOption, pageSize === sz && styles.pageSizeOptionActive]}
              >
                <Text style={[styles.pageSizeOptionText, pageSize === sz && styles.pageSizeOptionTextActive]}>
                  {sz}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Row 2: Page Navigation Row (Centered on small screens) */}
          <View style={[styles.pageButtonsRow, isSmallScreen && { justifyContent: 'center', width: '100%', gap: 12 }]}>
            <PillButton
              onPress={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              additionalStyle={[
                styles.pageBtn,
                currentPage <= 1 && styles.pageBtnDisabled,
                isSmallScreen && { width: 36, height: 36, paddingHorizontal: 0, justifyContent: 'center', alignItems: 'center', borderRadius: 18 }
              ]}
              fontSize={12}
            >
              {isSmallScreen ? (
                <AppIcon name="chevron.left" size={14} color="#ffffff" />
              ) : (
                "← Prev"
              )}
            </PillButton>

            <Text style={styles.pageIndicatorText}>
              Page {currentPage} of {totalPages}
            </Text>

            <PillButton
              onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              additionalStyle={[
                styles.pageBtn,
                currentPage >= totalPages && styles.pageBtnDisabled,
                isSmallScreen && { width: 36, height: 36, paddingHorizontal: 0, justifyContent: 'center', alignItems: 'center', borderRadius: 18 }
              ]}
              fontSize={12}
            >
              {isSmallScreen ? (
                <AppIcon name="chevron.right" size={14} color="#ffffff" />
              ) : (
                "Next →"
              )}
            </PillButton>
          </View>
        </View>
      </View>
    )
  }

  return (
    <>
        <View style={styles.contentWrapper}>
          <View style={[styles.headerTitleRow, isSmallScreen && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
            <View style={{ flex: isSmallScreen ? undefined : 1, width: isSmallScreen ? '100%' : undefined }}>
              <Text style={styles.title}>Application Review Portal</Text>
              <Text style={styles.subtitle}>Review, filter, and manage attendee applications.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <PillButton
                title="Secret Links"
                onPress={() => { setShowInviteModal(true); fetchInviteCodes(); }}
                additionalStyle={{ width: 'auto', minWidth: 120, height: 40 }}
              />
              <PillButton
                title="↻ Refresh"
                onPress={fetchApplications}
                isLoading={loading}
                additionalStyle={styles.refreshBtn}
              />
            </View>
          </View>

          <AdminTabBar
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            appsCount={apps.length}
            usersCount={usersList.length ? usersList.length : '...'}
            onTabChange={(tab) => {
              if (tab === 'users') fetchUsersDirectory()
              if (tab === 'roles') { fetchRolesList(); fetchRolePermissions(); fetchInviteCodes(); }
              if (tab === 'forms') { fetchRolesList(); fetchFormSchema(selectedFormRole); }
            }}
          />

          {adminTab === 'roles' ? (
            <RolesAccessTab
              rolesLoading={rolesLoading}
              rolesList={rolesList}
              permissionsList={permissionsList}
              rolePermissionsMap={rolePermissionsMap}
              handleUpdateRolePermissions={handleUpdateRolePermissions}
              fetchRolesList={fetchRolesList}
              fetchInviteCodes={fetchInviteCodes}
              setShowCreateRoleModal={setShowCreateRoleModal}
              handleToggleRoleVisibility={handleToggleRoleVisibility}
              setNewInviteRole={setNewInviteRole}
              setShowInviteModal={setShowInviteModal}
              handleUpdateRoleDeadline={handleUpdateRoleDeadline}
              inviteCodesList={inviteCodesList}
              copiedCodeId={copiedCodeId}
              copyInviteLink={copyInviteLink}
              styles={styles}
            />
          ) : adminTab === 'forms' ? (
            <FormBuilderTab
              selectedFormRole={selectedFormRole}
              setSelectedFormRole={setSelectedFormRole}
              fetchFormSchema={fetchFormSchema}
              setShowAddFieldModal={setShowAddFieldModal}
              formBuilderLoading={formBuilderLoading}
              formFieldsList={formFieldsList}
              formSectionsList={formSectionsList}
              allFormFields={allFormFields}
              handleRemoveFieldFromRole={handleRemoveFieldFromRole}
              handleReorderField={handleReorderField}
              handleAttachExistingField={handleAttachExistingField}
              handleEditField={handleOpenFieldEditor}
              formDraftCount={formDraftActions.length}
              applyFormDraft={applyFormDraft}
              discardFormDraft={discardFormDraft}
              formDraftSaving={formDraftSaving}
              handleAddSection={handleAddSection}
              rolesList={rolesList}
              styles={styles}
            />
          ) : adminTab === 'users' ? (
            <UserDirectoryTab
              userSearchQuery={userSearchQuery}
              setUserSearchQuery={setUserSearchQuery}
              userRoleFilter={userRoleFilter}
              setUserRoleFilter={setUserRoleFilter}
              fetchUsersDirectory={fetchUsersDirectory}
              usersLoading={usersLoading}
              filteredUsers={filteredUsers}
              displayedUsers={displayedUsers}
              resetEmailSentUser={resetEmailSentUser}
              handleOpenEditUser={handleOpenEditUser}
              handleSendPasswordReset={handleSendPasswordReset}
              renderPaginationBar={renderPaginationBar}
              userPage={userPage}
              totalUserPages={totalUserPages}
              userPageSize={userPageSize}
              setUserPage={setUserPage}
              setUserPageSize={setUserPageSize}
              styles={styles}
            />
          ) : (
            <SubmissionsTab
              stats={{ ...stats, inReview: stats.changes || 0 }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              includeInput={includeInput}
              setIncludeInput={setIncludeInput}
              includeTags={includeTags}
              addIncludeTag={addIncludeTag}
              removeIncludeTag={removeIncludeTag}
              excludeInput={excludeInput}
              setExcludeInput={setExcludeInput}
              excludeTags={excludeTags}
              addExcludeTag={addExcludeTag}
              removeExcludeTag={removeExcludeTag}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              dynamicTypeOptions={dynamicTypeOptions}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              groupByTeams={groupByTeams}
              setGroupByTeams={setGroupByTeams}
              loading={loading}
              error={error}
              filteredApps={filteredApps}
              displayedApps={displayedApps}
              groupedData={groupedData}
              expandedTeams={expandedTeams}
              toggleTeamExpand={toggleTeamExpand}
              renderApplicationRow={renderApplicationRow}
              renderPaginationBar={renderPaginationBar}
              appPage={appPage}
              totalAppPages={totalAppPages}
              appPageSize={appPageSize}
              setAppPage={setAppPage}
              setAppPageSize={setAppPageSize}
              onOpenMessageModal={openMessageModal}
              styles={styles}
            />
          )}
    </View>

      <DirectMessageModal
        visible={messageModalState.visible}
        onClose={() => setMessageModalState(prev => ({ ...prev, visible: false }))}
        targetType={messageModalState.targetType}
        targetId={messageModalState.targetId}
        targetName={messageModalState.targetName}
        memberUserIds={messageModalState.memberUserIds}
      />

      <UserEditModal
        visible={!!editingUser}
        onClose={() => setEditingUser(null)}
        editingUser={editingUser}
        editFirstName={editFirstName}
        setEditFirstName={setEditFirstName}
        editLastName={editLastName}
        setEditLastName={setEditLastName}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editRoles={editRoles}
        toggleEditRole={toggleEditRole}
        handleSaveUserChanges={handleSaveUserChanges}
        isSavingUser={isSavingUser}
        allAvailableSystemRoles={['user', 'admin', 'organizer', 'volunteer', 'mentor', 'judge', 'sponsor']}
      />

      {/* Create New Role Modal */}
      <CreateRoleModal
        visible={showCreateRoleModal}
        onClose={() => setShowCreateRoleModal(false)}
        newRoleId={newRoleId}
        setNewRoleId={setNewRoleId}
        newRoleLabel={newRoleLabel}
        setNewRoleLabel={setNewRoleLabel}
        newRoleDesc={newRoleDesc}
        setNewRoleDesc={setNewRoleDesc}
        newRolePublic={newRolePublic}
        setNewRolePublic={setNewRolePublic}
        newRoleCloseAt={newRoleCloseAt}
        setNewRoleCloseAt={setNewRoleCloseAt}
        handleCreateRole={handleCreateRole}
        isCreatingRole={isCreatingRole}
      />

      {/* Add Question Field Modal */}
      <AddFieldModal
        visible={showAddFieldModal}
        onClose={() => { setShowAddFieldModal(false); resetFieldEditor() }}
        selectedFormRole={selectedFormRole}
        newFieldKey={newFieldId}
        setNewFieldKey={setNewFieldId}
        newFieldLabelTranslations={newFieldLabelTranslations}
        setNewFieldLabelTranslations={setNewFieldLabelTranslations}
        newFieldSubtitleTranslations={newFieldSubtitleTranslations}
        setNewFieldSubtitleTranslations={setNewFieldSubtitleTranslations}
        newFieldSubtitleRich={newFieldSubtitleRich}
        setNewFieldSubtitleRich={setNewFieldSubtitleRich}
        newFieldConditionField={newFieldConditionField}
        setNewFieldConditionField={setNewFieldConditionField}
        newFieldConditionOperator={newFieldConditionOperator}
        setNewFieldConditionOperator={setNewFieldConditionOperator}
        newFieldConditionValue={newFieldConditionValue}
        setNewFieldConditionValue={setNewFieldConditionValue}
        newFieldUiMetadata={newFieldUiMetadata}
        setNewFieldUiMetadata={setNewFieldUiMetadata}
        newFieldOptions={newFieldOptions}
        setNewFieldOptions={setNewFieldOptions}
        newFieldType={newFieldType}
        setNewFieldType={setNewFieldType}
        newFieldRequired={newFieldRequired}
        setNewFieldRequired={setNewFieldRequired}
        newFieldSection={newFieldSection}
        setNewFieldSection={setNewFieldSection}
        formSectionsList={formSectionsList}
        allFormFields={allFormFields}
        editingFieldId={editingFieldId}
        handleAddFieldToRole={handleAddFieldToRole}
        isAddingField={isAddingField}
      />

      {/* Secret Invite Links Modal */}
      <SecretInviteModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        newInviteRole={newInviteRole}
        setNewInviteRole={setNewInviteRole}
        newInviteLabel={newInviteLabel}
        setNewInviteLabel={setNewInviteLabel}
        newInviteMaxUses={newInviteMaxUses}
        setNewInviteMaxUses={setNewInviteMaxUses}
        newInviteExpiresAt={newInviteExpiresAt}
        setNewInviteExpiresAt={setNewInviteExpiresAt}
        handleCreateInviteCode={handleCreateInviteCode}
        isCreatingInvite={isCreatingInvite}
        inviteCodesLoading={isInviteLoading}
        inviteCodesList={inviteCodesList}
        copiedCodeId={copiedCodeId}
        copyInviteLink={copyInviteLink}
        handleToggleInviteActive={handleToggleInviteActive}
        handleDeleteInvite={handleDeleteInvite}
      />
    </>
  )
}

// Sandbox local mock fallback
const mockApplications: Application[] = [
  {
    id: 'mock-1',
    status: 'submitted',
    admin_feedback: null,
    application_type_id: 'hacker',
    answers: {
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan@turing.org',
      country: 'United Kingdom',
      university: 'University of Cambridge',
      major: 'Mathematics',
      year: '2026',
      tshirt: 'M',
      diet: 'Vegan',
      github: 'github.com/turing',
      linkedin: 'linkedin.com/in/turing',
    },
    user_id: 'user-turing',
    profiles: {
      id: 'user-turing',
      first_name: 'Alan',
      last_name: 'Turing',
      email: 'alan@turing.org',
      team_id: 'team-enigma',
      teams: {
        id: 'team-enigma',
        name: 'Enigma Busters'
      }
    }
  },
  {
    id: 'mock-2',
    status: 'submitted',
    admin_feedback: null,
    application_type_id: 'hacker',
    answers: {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@hopper.edu',
      country: 'United States',
      university: 'Yale University',
      major: 'Computer Science',
      year: '2027',
      tshirt: 'S',
      diet: 'None',
      github: 'github.com/hopper',
    },
    user_id: 'user-hopper',
    profiles: {
      id: 'user-hopper',
      first_name: 'Grace',
      last_name: 'Hopper',
      email: 'grace@hopper.edu',
      team_id: 'team-enigma',
      teams: {
        id: 'team-enigma',
        name: 'Enigma Busters'
      }
    }
  },
  {
    id: 'mock-3',
    status: 'changes_requested',
    admin_feedback: 'Resume PDF link is broken, please re-upload.',
    application_type_id: 'hacker',
    answers: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@lovelace.com',
      country: 'United Kingdom',
      university: 'University of London',
      major: 'Analytical Systems',
      year: '2025',
      tshirt: 'S',
      diet: 'Gluten-Free',
    },
    user_id: 'user-ada',
    profiles: {
      id: 'user-ada',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@lovelace.com',
      team_id: null,
      teams: null
    }
  }
]

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 40,
    alignItems: 'center',
    maxWidth: 450,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      },
    }),
  },
  accessDeniedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    color: '#22002c',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  accessDeniedSubtitle: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    width: '100%',
    marginBottom: 24,
    justifyContent: 'center',
  },
  statBox: {
    flex: 1,
    minWidth: 140,
    maxWidth: 220,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  statCount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolbarCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 20,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
      },
    }),
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  searchInput: {
    flex: 2,
    minWidth: 260,
    height: 44,
    backgroundColor: '#fdfbfe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    paddingHorizontal: 16,
    color: '#22002c',
    fontSize: 14,
  },
  dropdownContainer: {
    minWidth: 140,
  },
  dropdownBtn: {
    height: 44,
    backgroundColor: '#fdfbfe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dropdownBtnText: {
    color: '#22002c',
    fontSize: 13,
    fontWeight: '700',
  },
  groupToggleBtn: {
    height: 48,
    backgroundColor: '#fdfbfe',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  groupToggleBtnActive: {
    backgroundColor: 'rgba(90, 0, 97, 0.08)',
    borderColor: '#5a0061',
  },
  groupToggleBtnText: {
    color: '#22002c',
    fontSize: 13,
    fontWeight: '700',
  },
  expandAllRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingTop: 4,
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(90, 0, 97, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.1)',
  },
  smallActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a0061',
  },
  countriesFilterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(90, 0, 97, 0.08)',
    paddingTop: 12,
  },
  countriesFilterLabel: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  countriesScroll: {
    flex: 1,
  },
  countryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.1)',
    marginRight: 8,
  },
  countryChipActive: {
    backgroundColor: '#c2b75f',
    borderColor: '#c2b75f',
  },
  countryChipText: {
    color: '#5b4d61',
    fontSize: 12,
    fontWeight: '600',
  },
  countryChipTextActive: {
    color: '#22002c',
  },
  loadingContainer: {
    marginVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
  },
  teamSection: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    padding: 20,
    gap: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.06)',
      },
    }),
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(90, 0, 97, 0.08)',
    paddingBottom: 12,
  },
  teamSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#22002c',
  },
  teamCountBadge: {
    backgroundColor: 'rgba(90, 0, 97, 0.06)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  teamCountBadgeText: {
    color: '#5a0061',
    fontSize: 12,
    fontWeight: '700',
  },
  teamAppsContainer: {
    gap: 12,
    marginTop: 12,
  },
  appCard: {
    width: '100%',
    backgroundColor: '#fdfbfe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.08)',
    overflow: 'hidden',
  },
  appHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerMainInfo: {
    flex: 2,
    minWidth: 200,
    gap: 2,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22002c',
  },
  applicantEmail: {
    fontSize: 13,
    color: '#666666',
  },
  headerSubInfo: {
    flex: 2,
    minWidth: 200,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  countryTag: {
    fontSize: 13,
    color: '#5b4d61',
    fontWeight: '600',
  },
  universityText: {
    fontSize: 12,
    color: '#888888',
  },
  headerStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandIndicator: {
    fontSize: 12,
    color: 'rgba(90, 0, 97, 0.4)',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 90,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  expandedDetails: {
    padding: 16,
    backgroundColor: '#fbf9fc',
    borderTopWidth: 1,
    borderTopColor: 'rgba(90, 0, 97, 0.06)',
    gap: 12,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5a0061',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  detailsCol: {
    flex: 1,
    minWidth: 260,
    gap: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(90, 0, 97, 0.5)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#22002c',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#5a0061',
    fontWeight: '700',
    marginBottom: 8,
  },
  feedbackBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  feedbackTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    maxWidth: 160,
    height: 40,
    borderRadius: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(90, 0, 97, 0.06)',
    marginVertical: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22002c',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 0, 44, 0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#22002c',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(34, 0, 44, 0.2)',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666666',
  },
  headerTitleRow: {
    ...Platform.select({
      web: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      default: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
      }
    }),
    width: '100%',
    marginBottom: 20,
  },
  refreshBtn: {
    width: 120,
    height: 40,
  },
  paginationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(90, 0, 97, 0.12)',
    width: '100%',
    marginTop: 16,
  },
  paginationInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },
  paginationControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  pageSizeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageSizeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777777',
    marginRight: 2,
  },
  pageSizeOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  pageSizeOptionActive: {
    backgroundColor: '#5a0061',
  },
  pageSizeOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  pageSizeOptionTextActive: {
    color: '#ffffff',
  },
  pageButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22002c',
  },
  pageBtn: {
    height: 34,
    paddingHorizontal: 12,
    width: 'auto',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
})
