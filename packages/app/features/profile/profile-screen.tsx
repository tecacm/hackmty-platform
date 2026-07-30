'use client'

import * as React from 'react'
const { useEffect, useState } = React
import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Image,
  Pressable,
  Alert,
  Modal,
  Linking,
} from 'react-native'

import { StyledInput } from 'app/components/styled-input'
import { StyledSelect } from 'app/components/styled-select'
import { StyledAutocomplete } from 'app/components/styled-autocomplete'
import { PillButton } from 'app/components/pill-button'
import { useSmartNavigate } from 'app/navigation/use-smart-navigate'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { formFieldColors } from 'app/components/form-field-styles'
import { dataReferences } from 'app/features/applicant/applicant-field-config'
import { pickAvatar } from './pick-avatar'
import { useUserPermissions } from 'app/hooks/use-user-permissions'
import { PersonSilhouette } from 'app/components/person-silhouette'

import { sanitizeName, sanitizeString, sanitizeUrl } from 'app/utils/sanitization'

// Static fallback option arrays for selects
const defaultGenderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'nonbinary' },
  { label: 'Prefer not to answer', value: 'prefer_not_to_answer' },
]

const defaultLevelOfStudyOptions = [
  { label: 'Less than Secondary / High School', value: 'less_than_secondary' },
  { label: 'Secondary / High School', value: 'secondary' },
  { label: 'Undergraduate (2 year - community college or similar)', value: 'undergraduate_2_year' },
  { label: 'Undergraduate (3+ year)', value: 'undergraduate_3_year' },
  { label: 'Graduate University (Masters, Professional, Doctoral, etc)', value: 'graduate' },
  { label: 'Code School / Bootcamp', value: 'code_school' },
  { label: 'Other Vocational / Trade Program or Apprenticeship', value: 'other_vocational' },
  { label: 'Post Doctorate', value: 'post_doctorate' },
  { label: 'Other', value: 'other' },
  { label: "I'm not currently a student", value: 'not_a_student' },
]

const defaultTshirtOptions = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'Extra Large', value: 'xlarge' },
]

const defaultDietOptions = [
  { label: 'None', value: 'none' },
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'No pork', value: 'no_pork' },
  { label: 'Gluten-Free', value: 'gluten_free' },
]

function InfoTile({
  label,
  value,
  isLink,
  onPress,
}: {
  label: string
  value?: string | null
  isLink?: boolean
  onPress?: () => void
}) {
  const content = (
    <View style={styles.infoTile}>
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text
        style={[
          styles.infoTileValue,
          !value && styles.infoTileEmpty,
          isLink && value ? styles.infoTileLink : undefined,
        ]}
        numberOfLines={2}
      >
        {value || 'Not specified'}
      </Text>
    </View>
  )

  if (isLink && value && onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={`Open ${label}: ${value}`}
        style={({ pressed }) => [pressed && { opacity: 0.75 }]}
      >
        {content}
      </Pressable>
    )
  }

  return content
}

import { AppIcon } from 'app/components/app-icon'
import { GlassButton } from 'app/components/glass-button'
import { useProfileNavHeader } from './use-profile-nav-header'

export function ProfileScreen({ navigation }: { navigation?: any }) {
  const { navigateTo, replaceTo } = useSmartNavigate()
  const { role: userRole } = useUserPermissions()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null)

  const handleToggleEdit = React.useCallback(() => {
    setFeedbackMessage(null)
    setIsEditing(prev => !prev)
  }, [])

  useProfileNavHeader(navigation, isEditing, handleToggleEdit)

  const handleAvatarPress = () => {
    if (isEditing) {
      openImagePicker()
    } else {
      setIsAvatarModalOpen(true)
    }
  }

  const handleOpenUrl = React.useCallback((rawUrl?: string | null) => {
    if (!rawUrl) return
    let formattedUrl = rawUrl.trim()
    if (!formattedUrl) return

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`
    }

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.open(formattedUrl, '_blank', 'noopener,noreferrer')
      } else {
        Linking.openURL(formattedUrl)
      }
    } else {
      Linking.openURL(formattedUrl).catch(() => {
        Alert.alert('Cannot Open Link', `Unable to open URL: ${formattedUrl}`)
      })
    }
  }, [])

  // Profile data state
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState('')
  const [university, setUniversity] = useState('')
  const [major, setMajor] = useState('')
  const [gradYear, setGradYear] = useState('')
  const [levelOfStudy, setLevelOfStudy] = useState('')
  const [tshirtSize, setTshirtSize] = useState('')
  const [dietary, setDietary] = useState('')
  const [github, setGithub] = useState('')
  const [devpost, setDevpost] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [personalSite, setPersonalSite] = useState('')
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Selection option states (initially using defaults, then loaded dynamically)
  const [genderOpts, setGenderOpts] = useState(defaultGenderOptions)
  const [levelOfStudyOpts, setLevelOfStudyOpts] = useState(defaultLevelOfStudyOptions)
  const [tshirtOpts, setTshirtOpts] = useState(defaultTshirtOptions)
  const [dietOpts, setDietOpts] = useState(defaultDietOptions)

  // Load User & Profile values
  useEffect(() => {
    async function loadProfile() {
      if (!isSupabaseConfigured) {
        setIsLoading(false)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          replaceTo('/login')
          return
        }

        setUserId(user.id)
        setEmail(user.email || '')

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profile) {
          setFirstName(profile.first_name || '')
          setLastName(profile.last_name || '')
          setPhone(profile.phone || '')
          setGender(profile.gender || '')
          setUniversity(profile.university || '')
          setMajor(profile.major || '')
          setGradYear(profile.graduation_year || '')
          setLevelOfStudy(profile.level_of_study || '')
          setTshirtSize(profile.tshirt_size || '')
          setDietary(profile.dietary_restrictions || '')
          setGithub(profile.github || '')
          setDevpost(profile.devpost || '')
          setLinkedin(profile.linkedin || '')
          setPersonalSite(profile.personal_site || '')
          setResumeUrl(profile.resume_url || null)

          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url)
            const { data } = supabase.storage
              .from('avatars')
              .getPublicUrl(profile.avatar_url)
            if (data?.publicUrl) {
              setAvatarDisplayUrl(data.publicUrl)
            }
          }
        }

        // Fetch dynamic form field choices
        const { data: fieldsData } = await supabase
          .from('form_fields')
          .select('id, options')
          .in('id', ['gender', 'tshirt', 'diet', 'levelOfStudy'])

        if (fieldsData) {
          const getVal = (jsonbVal: any) => {
            if (!jsonbVal) return null
            return jsonbVal['en'] || jsonbVal
          }
          const mapOpts = (optionsList: any[]) => {
            if (!optionsList) return []
            return optionsList.map((opt: any) => ({
              label: getVal(opt.label) || opt.value || '',
              value: opt.value || '',
            }))
          }

          fieldsData.forEach((field: any) => {
            const mapped = mapOpts(field.options)
            if (mapped.length > 0) {
              if (field.id === 'gender') setGenderOpts(mapped)
              if (field.id === 'tshirt') setTshirtOpts(mapped)
              if (field.id === 'diet') setDietOpts(mapped)
              if (field.id === 'levelOfStudy') setLevelOfStudyOpts(mapped)
            }
          })
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  // Handle image upload to Supabase storage
  const uploadAvatar = async (payload: any, fileName: string, mimeType: string) => {
    if (!isSupabaseConfigured || !userId) return

    try {
      setIsUploading(true)
      setFeedbackMessage(null)

      const fileExt = fileName.split('.').pop()
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, payload, { 
          upsert: true,
          contentType: mimeType
        })

      if (uploadError) throw uploadError

      // Update avatar_url field in profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', userId)

      if (dbError) throw dbError

      setAvatarUrl(filePath)
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      if (data?.publicUrl) {
        setAvatarDisplayUrl(data.publicUrl)
        
        // Sync local cache
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          const cacheKey = `user_profile_${userId}`
          const cached = localStorage.getItem(cacheKey)
          let initials = ''
          if (cached) {
            try {
              const parsedInitials = JSON.parse(cached).initials
              if (parsedInitials && parsedInitials !== '👤') initials = parsedInitials
            } catch (e) {}
          }
          localStorage.setItem(cacheKey, JSON.stringify({
            initials,
            avatarUrl: data.publicUrl,
          }))
        }
      }

      setFeedbackMessage({ text: 'Profile photo updated successfully!', isError: false })
    } catch (err: any) {
      console.error('Avatar upload failed:', err)
      setFeedbackMessage({ text: err.message || 'Failed to upload image.', isError: true })
    } finally {
      setIsUploading(false)
    }
  }

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const lookup = new Uint8Array(256)
    for (let i = 0; i < chars.length; i++) {
      lookup[chars.charCodeAt(i)] = i
    }
    let bufferLength = base64.length * 0.75
    const len = base64.length
    let i = 0
    let p = 0
    let encoded1, encoded2, encoded3, encoded4

    if (base64[base64.length - 1] === '=') {
      bufferLength--
      if (base64[base64.length - 2] === '=') {
        bufferLength--
      }
    }

    const arrayBuffer = new ArrayBuffer(bufferLength)
    const bytes = new Uint8Array(arrayBuffer)

    for (i = 0; i < len; i += 4) {
      encoded1 = lookup[base64.charCodeAt(i)]
      encoded2 = lookup[base64.charCodeAt(i + 1)]
      encoded3 = lookup[base64.charCodeAt(i + 2)]
      encoded4 = lookup[base64.charCodeAt(i + 3)]

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4)
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
    }

    return arrayBuffer
  }

  const openImagePicker = async () => {
    if (isUploading) return

    try {
      const picked = await pickAvatar()
      if (!picked) return

      let payload: any
      if (Platform.OS === 'web') {
        payload = picked.uri // File object
      } else if (picked.base64) {
        payload = base64ToArrayBuffer(picked.base64)
      } else {
        const formData = new FormData()
        formData.append('file', {
          uri: picked.uri,
          name: picked.name,
          type: picked.type,
        } as any)
        payload = formData
      }

      await uploadAvatar(payload, picked.name, picked.type)
    } catch (err: any) {
      console.error('Image picking failed:', err)
      setFeedbackMessage({ text: err.message || 'Failed to select image.', isError: true })
    }
  }

  // Save full profile details to DB
  const handleSaveProfile = async () => {
    if (!isSupabaseConfigured || !userId) return

    try {
      setIsSaving(true)
      setFeedbackMessage(null)

      const cleanFirstName = sanitizeName(firstName)
      const cleanLastName = sanitizeName(lastName)
      const cleanPhone = sanitizeString(phone)
      const cleanGender = sanitizeString(gender)
      const cleanUniversity = sanitizeName(university)
      const cleanMajor = sanitizeName(major)
      const cleanGradYear = sanitizeString(gradYear)
      const cleanLevelOfStudy = sanitizeString(levelOfStudy)
      const cleanTshirtSize = sanitizeString(tshirtSize)
      const cleanDietary = sanitizeString(dietary)
      const cleanGithub = sanitizeUrl(github)
      const cleanDevpost = sanitizeUrl(devpost)
      const cleanLinkedin = sanitizeUrl(linkedin)
      const cleanPersonalSite = sanitizeUrl(personalSite)

      const { error: saveError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          phone: cleanPhone,
          gender: cleanGender,
          university: cleanUniversity,
          major: cleanMajor,
          graduation_year: cleanGradYear,
          level_of_study: cleanLevelOfStudy,
          tshirt_size: cleanTshirtSize,
          dietary_restrictions: cleanDietary,
          github: cleanGithub,
          devpost: cleanDevpost,
          linkedin: cleanLinkedin,
          personal_site: cleanPersonalSite,
        })

      if (saveError) throw saveError

      // Sync local cache
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const cacheKey = `user_profile_${userId}`
        const first = (firstName || '').charAt(0).toUpperCase()
        const last = (lastName || '').charAt(0).toUpperCase()
        localStorage.setItem(cacheKey, JSON.stringify({
          initials: `${first}${last}` || '👤',
          avatarUrl: avatarDisplayUrl,
        }))
      }

      setFeedbackMessage({ text: 'Profile changes saved successfully!', isError: false })
      setIsEditing(false)
    } catch (err: any) {
      console.error('Failed to save profile changes:', err)
      setFeedbackMessage({ text: err.message || 'Failed to save changes.', isError: true })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete account cascade handler (files + auth user delete via RPC)
  const handleDeleteAccount = async () => {
    if (!isSupabaseConfigured || !userId) return

    try {
      setIsDeleting(true)
      setFeedbackMessage(null)

      // 1. Remove resume file from bucket if exists
      if (resumeUrl) {
        await supabase.storage.from('resumes').remove([resumeUrl])
      }

      // 2. Remove avatar file from bucket if exists
      if (avatarUrl) {
        await supabase.storage.from('avatars').remove([avatarUrl])
      }

      // 3. Call database function to delete Auth user row (cascades to profiles & applications)
      const { error: deleteError } = await supabase.rpc('delete_user_account')
      if (deleteError) throw deleteError

      // 4. Clear auth session and redirect
      await supabase.auth.signOut()
      navigateTo('/login')
    } catch (err: any) {
      console.error('Account deletion failed:', err)
      setFeedbackMessage({ text: err.message || 'Failed to delete account.', isError: true })
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmDeleteAccount = () => {
    const warningMessage =
      'WARNING: This will permanently delete your profile, hackathon application, and all uploaded files (resume & avatar). This action is IRREVERSIBLE.\n\nAre you sure you want to proceed?'

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm(warningMessage)
      if (confirmWeb) {
        handleDeleteAccount()
      }
    } else {
      Alert.alert(
        'Delete My Account',
        warningMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: handleDeleteAccount,
          },
        ]
      )
    }
  }

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    replaceTo('/login')
  }

  // Prefill references from static assets
  const uniOptions = dataReferences.universities || []
  const majorOptions = dataReferences.majors || []
  const gradYearOptions = (dataReferences.graduationYears || []).map(y => ({
    label: y.label,
    value: y.value,
  }))

  const getOptionLabel = (options: { label: string; value: string }[], val: string) => {
    if (!val) return null
    const found = options.find((o) => o.value === val)
    return found ? found.label : val
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Your Name'
  const formattedRole = userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()
    : 'Hacker'

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={{ marginVertical: 60, alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 16 }}>Loading profile details...</Text>
        </View>
      ) : (
        <>
          {/* Floating Header (Outside the white card) */}
          <View style={styles.floatingHeader}>
            {/* Avatar Circle floating outside container without gold ring */}
            <Pressable
              onPress={handleAvatarPress}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Change profile photo' : 'View enlarged profile photo'}
              style={({ pressed }) => [
                styles.avatarWrapper,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
              ]}
              disabled={isUploading}
            >
              <View style={styles.avatarCircle}>
                {avatarDisplayUrl ? (
                  <Image source={{ uri: avatarDisplayUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <PersonSilhouette size={110} />
                  </View>
                )}
                {isUploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                )}
              </View>

              {/* Camera edit button is ONLY available when in Edit Mode */}
              {isEditing && (
                <View style={styles.editPhotoButton}>
                  <AppIcon name="camera.fill" color="#ffffff" size={16} />
                </View>
              )}
            </Pressable>

            {/* Floating White Name */}
            <Text style={styles.floatingName}>{fullName}</Text>

            {/* Role label directly under the name without a pill box */}
            <Text style={styles.floatingRole}>{formattedRole}</Text>

            {/* Quick Action Slot */}
            <View style={styles.quickActionsContainer}>
              {false &&
              <GlassButton
                glassEffectStyle="clear"
                colorScheme="dark"
                accessibilityRole="button"
                accessibilityLabel="Show My QR Code"
                style={styles.quickActionButton}
                onPress={() => {
                  Alert.alert('My QR', 'QR Code check-in and info sharing features coming soon!')
                }}
              >
                <AppIcon name="qrcode" color="#ffffff" size={16} />
                <Text style={styles.quickActionText}>My QR</Text>
              </GlassButton>
              }
            </View>
          </View>

          {/* Profile Content Card - Material Container */}
          <View style={styles.innerCard}>
            {/* Card Header Row */}
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Profile Information</Text>
                <Text style={styles.cardSubtitle}>
                  {isEditing ? 'Editing your personal information' : 'Personal & account details'}
                </Text>
              </View>

              {Platform.OS === 'web' && (
                <GlassButton
                  glassEffectStyle="clear"
                  colorScheme="dark"
                  accessibilityRole="button"
                  accessibilityLabel={isEditing ? 'Cancel editing profile' : 'Edit profile information'}
                  style={[
                    styles.toggleEditBtn,
                    isEditing && styles.toggleEditBtnCancel,
                  ]}
                  onPress={handleToggleEdit}
                >
                  <Text style={[styles.toggleEditBtnText, isEditing && styles.toggleEditBtnTextCancel]}>
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Text>
                </GlassButton>
              )}
            </View>

            {feedbackMessage && (
              <View
                style={[
                  styles.feedbackBox,
                  feedbackMessage.isError ? styles.errorBox : styles.successBox,
                ]}
              >
                <Text style={styles.feedbackText}>{feedbackMessage.text}</Text>
              </View>
            )}

            {!isEditing ? (
              /* VIEW MODE (Nice minimized style) */
              <View style={styles.viewModeContainer}>
                <View style={styles.infoSection}>
                  <Text style={styles.sectionHeading}>PERSONAL DETAILS</Text>
                  <View style={styles.infoGrid}>
                    <InfoTile label="First Name" value={firstName} />
                    <InfoTile label="Last Name" value={lastName} />
                    <InfoTile label="Email Address" value={email} />
                    <InfoTile label="Phone Number" value={phone} />
                    <InfoTile label="Gender" value={getOptionLabel(genderOpts, gender)} />
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.sectionHeading}>ACADEMIC INFORMATION</Text>
                  <View style={styles.infoGrid}>
                    <InfoTile label="University" value={university} />
                    <InfoTile label="Major" value={major} />
                    <InfoTile label="Graduation Year" value={getOptionLabel(gradYearOptions, gradYear)} />
                    <InfoTile label="Level of Study" value={getOptionLabel(levelOfStudyOpts, levelOfStudy)} />
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.sectionHeading}>EVENT PREFERENCES</Text>
                  <View style={styles.infoGrid}>
                    <InfoTile label="T-Shirt Size" value={getOptionLabel(tshirtOpts, tshirtSize)} />
                    <InfoTile label="Dietary Restrictions" value={getOptionLabel(dietOpts, dietary)} />
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.sectionHeading}>LINKS & SOCIALS</Text>
                  <View style={styles.infoGrid}>
                    <InfoTile label="GitHub" value={github} isLink onPress={() => handleOpenUrl(github)} />
                    <InfoTile label="Devpost" value={devpost} isLink onPress={() => handleOpenUrl(devpost)} />
                    <InfoTile label="LinkedIn" value={linkedin} isLink onPress={() => handleOpenUrl(linkedin)} />
                    <InfoTile label="Personal Website" value={personalSite} isLink onPress={() => handleOpenUrl(personalSite)} />
                  </View>
                </View>
              </View>
            ) : (
              /* EDIT MODE (Form input fields) */
              <View style={styles.gridContainer}>
                <StyledInput
                  label="First Name"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  required
                />

                <StyledInput
                  label="Last Name"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={setLastName}
                  required
                />

                <StyledInput
                  label="Email Address"
                  value={email}
                  editable={false}
                  additionalStyle={{ opacity: 0.8 }}
                />

                <StyledInput
                  label="Phone Number"
                  placeholder="+#########"
                  value={phone}
                  onChangeText={setPhone}
                />

                <StyledSelect
                  label="Gender"
                  placeholder="Select Gender..."
                  options={genderOpts}
                  value={gender}
                  onValueChange={setGender}
                />

                <StyledAutocomplete
                  label="University"
                  placeholder="Type your university..."
                  options={uniOptions}
                  value={university}
                  onChangeText={setUniversity}
                />

                <StyledAutocomplete
                  label="Major"
                  placeholder="Type your major..."
                  options={majorOptions}
                  value={major}
                  onChangeText={setMajor}
                />

                <StyledSelect
                  label="Graduation Year"
                  placeholder="Select Graduation Year..."
                  options={gradYearOptions}
                  value={gradYear}
                  onValueChange={setGradYear}
                />

                <StyledSelect
                  label="Level of Study"
                  placeholder="Select Level of Study..."
                  options={levelOfStudyOpts}
                  value={levelOfStudy}
                  onValueChange={setLevelOfStudy}
                />

                <StyledSelect
                  label="T-Shirt Size"
                  placeholder="Select T-Shirt Size..."
                  options={tshirtOpts}
                  value={tshirtSize}
                  onValueChange={setTshirtSize}
                />

                <StyledSelect
                  label="Dietary Restrictions"
                  placeholder="Select Dietary Restrictions..."
                  options={dietOpts}
                  value={dietary}
                  onValueChange={setDietary}
                />

                <StyledInput
                  label="GitHub URL"
                  placeholder="https://github.com/username"
                  value={github}
                  onChangeText={setGithub}
                />

                <StyledInput
                  label="Devpost URL"
                  placeholder="https://devpost.com/username"
                  value={devpost}
                  onChangeText={setDevpost}
                />

                <StyledInput
                  label="LinkedIn URL"
                  placeholder="https://linkedin.com/in/username"
                  value={linkedin}
                  onChangeText={setLinkedin}
                />

                <StyledInput
                  label="Personal Website URL"
                  placeholder="https://example.com"
                  value={personalSite}
                  onChangeText={setPersonalSite}
                />

                {/* Edit Form Actions */}
                <View style={styles.editActionRow}>
                  <PillButton
                    title={isSaving ? 'Saving Changes...' : 'Save Profile'}
                    onPress={isSaving ? () => {} : handleSaveProfile}
                    additionalStyle={{ flex: 1, opacity: isSaving ? 0.6 : 1 }}
                  />
                  <PillButton
                    variant="outline-secondary"
                    title="Cancel"
                    onPress={() => setIsEditing(false)}
                    additionalStyle={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {/* Mobile Sign Out */}
            {Platform.OS !== 'web' && (
              <View style={styles.mobileSignOutRow}>
                <PillButton
                  variant="outline-primary"
                  title="Sign Out"
                  onPress={handleSignOut}
                />
              </View>
            )}

            {/* Danger Zone - Only visible in Edit Mode */}
            {isEditing && (
              <View style={styles.dangerZone}>
                <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
                <Text style={styles.dangerZoneDescription}>
                  Permanently delete your profile and all associated hackathon application data.
                </Text>
                <PillButton
                  variant="danger"
                  title="Delete My Account"
                  isLoading={isDeleting}
                  onPress={confirmDeleteAccount}
                />
              </View>
            )}
          </View>

          {/* Larger Avatar Lightbox Modal when clicking pfp while not editing */}
          <Modal
            visible={isAvatarModalOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsAvatarModalOpen(false)}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setIsAvatarModalOpen(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalAvatarCircle}>
                  {avatarDisplayUrl ? (
                    <Image source={{ uri: avatarDisplayUrl }} style={styles.modalAvatarImage} />
                  ) : (
                    <View style={styles.modalAvatarFallback}>
                      <PersonSilhouette size={200} />
                    </View>
                  )}
                </View>
                <Text style={styles.modalNameText}>{fullName}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.closeModalBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setIsAvatarModalOpen(false)}
                >
                  <Text style={styles.closeModalBtnText}>Close</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '90%',
    maxWidth: 900,
    alignItems: 'center',
  },
  floatingHeader: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    backgroundColor: '#ffffff22',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#ffffff33',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: formFieldColors.theme,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoIcon: {
    fontSize: 14,
  },
  floatingName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  floatingRole: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 22,
    alignSelf: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
      } as any,
    }),
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  innerCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
      },
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: formFieldColors.theme,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  toggleEditBtn: {
    backgroundColor: 'rgba(75, 22, 135, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(75, 22, 135, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  toggleEditBtnCancel: {
    ...Platform.select({
      android: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderColor: 'rgba(0, 0, 0, 0.15)',
      },
      web: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        borderColor: 'rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  toggleEditBtnText: {
    color: formFieldColors.theme,
    fontSize: 13,
    fontWeight: '700',
  },
  toggleEditBtnTextCancel: {
    color: '#666666',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  successBox: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  feedbackText: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
    color: '#000000',
  },
  viewModeContainer: {
    gap: 24,
  },
  infoSection: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#888888',
    letterSpacing: 1.2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoTile: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoTileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  infoTileValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
  },
  infoTileEmpty: {
    color: '#adb5bd',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  infoTileLink: {
    color: formFieldColors.theme,
  },
  gridContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  mobileSignOutRow: {
    marginTop: 24,
  },
  dangerZone: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#ffdede',
    alignItems: 'center',
    gap: 8,
  },
  dangerZoneTitle: {
    color: '#d32f2f',
    fontSize: 18,
    fontWeight: '700',
  },
  dangerZoneDescription: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
      } as any,
    }),
  },
  modalContent: {
    backgroundColor: 'rgba(35, 10, 50, 0.95)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: 400,
    width: '90%',
    ...Platform.select({
      web: {
        cursor: 'default',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      } as any,
    }),
  },
  modalAvatarCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    backgroundColor: '#ffffff22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff33',
  },
  modalNameText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeModalBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  closeModalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
})
