'use client'

import React, { useEffect, useState } from 'react'
import {
  Dimensions,
  Text,
  View,
  useWindowDimensions,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Image,
  Pressable,
  Alert,
} from 'react-native'
import { SolitoImage } from 'solito/image'
import { useSafeArea } from 'app/provider/safe-area/use-safe-area'
import { ParallaxScrollView } from 'app/components/parallax-scroll-view'
import { WebNavbar } from 'app/components/web-navbar'
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
import numbersbg from 'app/assets/images/numbers-bg.webp'

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

export function ProfileScreen() {
  const { navigateTo, replaceTo } = useSmartNavigate()
  const { role: userRole } = useUserPermissions()
  const insets = useSafeArea()
  const { width } = useWindowDimensions()
  const [height, setHeight] = useState(0)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null)

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

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const update = () => setHeight(window.innerHeight)
      update()
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    } else {
      const update = () => setHeight(Dimensions.get('screen').height)
      update()
      const sub = Dimensions.addEventListener('change', update)
      return () => sub?.remove()
    }
  }, [])

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
          let initials = '👤'
          if (cached) {
            try {
              initials = JSON.parse(cached).initials || '👤'
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

      const { error: saveError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          phone,
          gender,
          university,
          major,
          graduation_year: gradYear,
          level_of_study: levelOfStudy,
          tshirt_size: tshirtSize,
          dietary_restrictions: dietary,
          github,
          devpost,
          linkedin,
          personal_site: personalSite,
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

  const backgroundProps: any = {
    src: numbersbg,
    width: isHydrated && width > 0 ? width : 1920,
    height: isHydrated && height > 0 ? height : 1080,
    contentFit: 'cover',
    resizeMode: 'cover',
    transition: 0,
    alt: 'Abstract numbers background',
  }

  const background = <SolitoImage {...backgroundProps} />

  return (
    <>
      <WebNavbar />
      <ParallaxScrollView
        background={background}
        style={{ backgroundColor: '#5a0061cc' }}
        contentContainerStyle={{
          alignItems: 'center',
          gap: 16,
          paddingTop: Platform.OS === 'web' ? 104 : insets.top,
          paddingBottom: insets.bottom + 40,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          overflow: 'visible',
        }}
      >
        <View style={styles.formContainer}>
          {isLoading ? (
            <View style={{ marginVertical: 60, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 16 }}>Loading profile details...</Text>
            </View>
          ) : (
            <View style={styles.innerCard}>
              <Text style={styles.titleText}>My Profile</Text>

              {/* Avatar Photo Section */}
              <View style={styles.avatarSection}>
                <Pressable onPress={openImagePicker} style={styles.avatarCircle}>
                  {avatarDisplayUrl ? (
                    <Image source={{ uri: avatarDisplayUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <View style={styles.silhouetteHead} />
                      <View style={styles.silhouetteShoulders} />
                    </View>
                  )}
                  {isUploading && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={openImagePicker} disabled={isUploading}>
                  <Text style={styles.uploadBtnText}>
                    {isUploading ? 'Uploading...' : 'Change Profile Photo'}
                  </Text>
                </Pressable>
              </View>

              {/* Account Role Section */}
              <View style={styles.roleCardContainer}>
                <View style={styles.roleHeaderRow}>
                  <Text style={styles.roleLabel}>Account Type:</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{userRole.toUpperCase()}</Text>
                  </View>
                </View>
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

              {/* Grid Form Fields */}
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
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <PillButton
                  title={isSaving ? 'Saving Changes...' : 'Save Profile'}
                  onPress={isSaving ? () => {} : handleSaveProfile}
                  additionalStyle={{ flex: 1, opacity: isSaving ? 0.6 : 1 }}
                />

                {Platform.OS !== 'web' && (
                  <PillButton
                    variant="outline-primary"
                    title="Sign Out"
                    onPress={handleSignOut}
                    additionalStyle={{ leftMargin: 10, flex: 1 }}
                  />
                )}
              </View>

              {/* Danger Zone */}
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
            </View>
          )}
        </View>
      </ParallaxScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  formContainer: {
    width: '90%',
    maxWidth: 1000,
    overflow: 'visible',
  },
  innerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    ...Platform.select({
      native: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 2,
      },
      web: {
        boxShadow: '0px 12px 32px rgba(34, 0, 44, 0.12)',
      },
    }),
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    color: formFieldColors.theme,
    marginBottom: 24,
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#c2b75f',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e2e2e2',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  silhouetteHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#a3a3a3',
    marginTop: -14,
  },
  silhouetteShoulders: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#a3a3a3',
    position: 'absolute',
    bottom: -29,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: formFieldColors.theme,
    fontSize: 14,
    fontWeight: '700',
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
  gridContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: 4,
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  signOutButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 24,
    marginLeft: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any
    })
  },
  signOutButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '700',
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
  deleteBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d32f2f',
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
    paddingHorizontal: 24,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any
    })
  },
  deleteBtnText: {
    color: '#d32f2f',
    fontSize: 15,
    fontWeight: '700',
  },
  roleCardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  roleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  roleLabel: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: '#ffd7001c',
    borderWidth: 1,
    borderColor: '#ffd700',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  permissionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  permissionsTitle: {
    color: '#a3a3a3',
    fontSize: 12,
    fontWeight: '600',
  },
  pillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  permissionPill: {
    backgroundColor: 'rgba(194, 183, 95, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(194, 183, 95, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  permissionPillText: {
    color: '#c2b75f',
    fontSize: 11,
    fontWeight: '500',
  },
})
