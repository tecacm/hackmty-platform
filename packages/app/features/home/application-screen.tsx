'use client'

import { Text, View, useWindowDimensions, ActivityIndicator } from 'react-native'
import { useEffect, useLayoutEffect } from 'react'
import { StyleSheet, Platform } from 'react-native'
import { useSearchParams, useRouter } from 'solito/navigation'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { ApplicantForm } from 'app/features/applicant/ApplicantForm'
import { ApplicantRole } from 'app/features/applicant/applicant-types'
import { getApplicantRoleLabel } from 'app/features/applicant/applicant-field-config'
import { useApplicationForm } from 'app/features/applicant/use-application-form'
import { useUserPermissions } from 'app/hooks/use-user-permissions'


const styles = StyleSheet.create({
  container: {
    overflow: 'visible', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    padding: 10,
    overflow: 'visible',
  },
  shadowStyle: {
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 2,      
      },
      web: {
        filter: 'drop-shadow(0px 5px 8px rgba(0, 0, 0, 0.4))',
      }
    })
  },
})

type ApplicationScreenProps = {
  navigation?: any
  role?: ApplicantRole
}

export function ApplicationScreen({ navigation, role }: ApplicationScreenProps = {}) {
  const params = useSearchParams()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const roleFromParams = role ?? params?.get('role')
  const applicantRole: ApplicantRole = roleFromParams ?? ''
  const applicantRoleLabel = getApplicantRoleLabel(applicantRole)

  const { hasPermission, loading: permissionsLoading } = useUserPermissions()

  const {
    isLoading: isConfigLoading,
    error: configError,
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
    isClosed
  } = useApplicationForm(applicantRole, 'en')

  const isLoading = isConfigLoading || permissionsLoading

  useEffect(() => {
    async function checkAuth() {
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
        }
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!permissionsLoading && !isConfigLoading) {
      const hasApp = status !== null
      const canCreate = hasPermission('applications', 'create')
      if (!hasApp && !canCreate) {
        router.replace('/profile')
      }
    }
  }, [permissionsLoading, isConfigLoading, status, hasPermission, router])

  useLayoutEffect(() => {
    if (navigation && typeof (navigation as any).setOptions === 'function') {
      ;(navigation as any).setOptions({ title: `Applying as ${applicantRoleLabel}` })
    }
  }, [navigation, applicantRoleLabel])

  return (
    <View style={[styles.container, { width: '90%', maxWidth: 1000 }]}>
      {isLoading ? (
        <View style={{ marginVertical: 60, alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 16 }}>Loading application...</Text>
        </View>
      ) : configError ? (
        <View style={{ marginVertical: 60, alignItems: 'center', gap: 12 }}>
          <Text style={{ color: '#ff4444', fontSize: 18, fontWeight: '700' }}>Failed to Load Application</Text>
          <Text style={{ color: '#ffffff', textAlign: 'center' }}>{configError}</Text>
        </View>
      ) : (
        <ApplicantForm
          role={applicantRole}
          fields={fields}
          initialValues={initialValues}
          disabledFields={disabledFields}
          status={status}
          adminFeedback={adminFeedback}
          feedbackHistory={feedbackHistory}
          onSubmit={onSubmit}
          onSaveDraft={onSaveDraft}
          onConfirmAttendance={onConfirmAttendance}
          systemLinks={systemLinks}
          isClosed={isClosed}
        />
      )}
    </View>          
  )
}
