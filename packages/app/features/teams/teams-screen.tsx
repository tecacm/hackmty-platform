import * as React from 'react'
import { useState, useEffect } from 'react'
import { StyleSheet, View, Text, Platform, ActivityIndicator, Pressable, useWindowDimensions, Image, Clipboard, Modal } from 'react-native'

import { PillButton } from 'app/components/pill-button'
import { isSupabaseConfigured, supabase } from 'app/lib/supabase'
import { StyledInput } from 'app/components/styled-input'
import { PersonSilhouette } from 'app/components/person-silhouette'

interface Member {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  avatar_display_url?: string | null
}

interface Team {
  id: string
  name: string
  code: string
  creator_id: string | null
  members: Member[]
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    width: '90%',
    maxWidth: 600,
    overflow: 'visible',
  },
  innerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
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
    fontSize: 28,
    fontWeight: '800',
    color: '#22002c',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22002c',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  codeBox: {
    backgroundColor: 'rgba(194, 183, 95, 0.1)',
    borderWidth: 1.5,
    borderColor: '#c2b75f',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  codeText: {
    color: '#c2b75f',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  copyBtn: {
    backgroundColor: 'rgba(34, 0, 44, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 0, 44, 0.08)',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  copyBtnText: {
    color: '#22002c',
    fontSize: 13,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 0, 44, 0.06)',
    width: '100%',
  },
  memberInitials: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(194, 183, 95, 0.15)',
    borderWidth: 1.5,
    borderColor: '#c2b75f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitialsText: {
    color: '#c2b75f',
    fontSize: 13,
    fontWeight: 'bold',
  },
  memberName: {
    color: '#22002c',
    fontSize: 16,
    fontWeight: '600',
  },
  memberAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  ownerBadge: {
    color: '#c2b75f',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    backgroundColor: 'rgba(194, 183, 95, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kickBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  kickBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(34, 0, 44, 0.08)',
    width: '100%',
    marginVertical: 24,
  },
  leaveButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  inviteBtn: {
    backgroundColor: '#c2b75f',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  inviteBtnText: {
    color: '#22002c',
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(29, 4, 31, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22002c',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalResultText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  modalCancelBtnText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#c2b75f',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  modalSubmitBtnText: {
    color: '#22002c',
    fontSize: 15,
    fontWeight: '700',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 0, 44, 0.06)',
    width: '100%',
    gap: 12,
  },
  inviteText: {
    color: '#22002c',
    fontSize: 14,
  },
  acceptBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  acceptBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  declineBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  declineBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
  inviteTeammateBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#c2b75f',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  inviteTeammateBtnText: {
    color: '#c2b75f',
    fontSize: 15,
    fontWeight: '700',
  },
  leaveButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  inviteBtnRight: {
    backgroundColor: 'rgba(194, 183, 95, 0.12)',
    borderColor: 'rgba(194, 183, 95, 0.4)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      }
    })
  },
  inviteBtnRightText: {
    color: '#c2b75f',
    fontSize: 12,
    fontWeight: '700',
  },
  emptySlotText: {
    color: '#999999',
    fontSize: 15,
    fontStyle: 'italic',
  },
  memberInitialsPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(34, 0, 44, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 0, 44, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  silhouetteHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#a3a3a3',
    marginTop: -5,
  },
  silhouetteShoulders: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#a3a3a3',
    position: 'absolute',
    bottom: -11,
  },
  invitedEmailText: {
    color: '#22002c',
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  pendingBadge: {
    color: '#666666',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(34, 0, 44, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warningBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    width: '100%',
  },
  warningBannerHeader: {
    color: '#b45309',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  warningBannerSub: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  warningBannerItem: {
    marginTop: 6,
  },
  warningBannerName: {
    color: '#78350f',
    fontSize: 13,
    fontWeight: '700',
  },
  warningBannerFeedback: {
    color: '#78350f',
    fontSize: 13,
    fontStyle: 'italic',
    marginLeft: 10,
    marginTop: 2,
  },
  actionRequiredBadge: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#f59e0b',
  },
})

export function TeamsScreen() {

  const { width } = useWindowDimensions()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [teamNameInput, setTeamNameInput] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [maxTeamSize, setMaxTeamSize] = useState(4)
  const [isHydrated, setIsHydrated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmailInput, setInviteEmailInput] = useState('')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ status: string; message: string } | null>(null)
  const [invitations, setInvitations] = useState<any[]>([])
  const [sentInvitations, setSentInvitations] = useState<any[]>([])
  const [membersApplications, setMembersApplications] = useState<any[]>([])

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const fetchInvitations = async () => {
    try {
      if (!isSupabaseConfigured) {
        setInvitations([
          { id: 'inv-1', team_id: 'dev-team-abc', email: 'me@example.com', teams: { name: 'Alpha Team' } }
        ])
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) return

      const { data: inviteData, error: inviteErr } = await supabase
        .from('team_invitations')
        .select('id, team_id, email, teams ( name )')
        .eq('email', user.email.toLowerCase())

      if (inviteErr) throw inviteErr
      setInvitations(inviteData || [])
    } catch (err: any) {
      console.error('Failed to load pending user invitations:', err)
    }
  }

  const fetchTeamData = async () => {
    try {
      setError(null)
      setLoading(true)

      if (!isSupabaseConfigured) {
        if (team === null) {
          setTeam({
            id: 'dev-team-abc',
            name: 'Alpha Team',
            code: 'ALP123',
            creator_id: '1',
            members: [
              { id: '1', first_name: 'Ernesto', last_name: 'Developer', avatar_url: null },
              { id: '2', first_name: 'Jane', last_name: 'Doe', avatar_url: null }
            ]
          })
          setSentInvitations([
            { id: 'sent-1', email: 'pending-member@example.com' }
          ])
          setMembersApplications([
            { user_id: '2', status: 'changes_requested', admin_feedback: 'Please update your graduation year.' }
          ])
        }
        setLoading(false)
        return
      }

      // Fetch max team size configuration
      const { data: configData } = await supabase
        .from('global_config')
        .select('value')
        .eq('key', 'max_team_size')
        .maybeSingle()
      if (configData && configData.value) {
        const parsed = parseInt(configData.value, 10)
        if (!isNaN(parsed)) {
          setMaxTeamSize(parsed)
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTeam(null)
        setLoading(false)
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.team_id) {
        setTeam(null)
        await fetchInvitations()
        setLoading(false)
        return
      }

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name, code, creator_id')
        .eq('id', profile.team_id)
        .maybeSingle()

      if (teamError || !teamData) {
        setTeam(null)
        setLoading(false)
        return
      }

      const { data: membersData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('team_id', profile.team_id)

      const resolvedMembers = (membersData || []).map(member => {
        let displayUrl: string | null = null
        if (member.avatar_url) {
          displayUrl = supabase.storage.from('avatars').getPublicUrl(member.avatar_url).data.publicUrl
        }
        return {
          ...member,
          avatar_display_url: displayUrl
        }
      })

      setTeam({
        id: teamData.id,
        name: teamData.name,
        code: teamData.code,
        creator_id: teamData.creator_id,
        members: resolvedMembers
      })

      // Fetch application status for all team members
      const memberIds = resolvedMembers.map(m => m.id)
      const { data: appsData } = await supabase
        .from('applications')
        .select('user_id, status, admin_feedback')
        .in('user_id', memberIds)
      setMembersApplications(appsData || [])

      const { data: sentData } = await supabase
        .from('team_invitations')
        .select('id, email')
        .eq('team_id', teamData.id)
      setSentInvitations(sentData || [])
    } catch (err: any) {
      console.error('Failed to load team details:', err)
      setError(err.message || 'Unable to retrieve team details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  }, [])

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setError(null)
      setSubmitting(true)

      if (!isSupabaseConfigured) {
        setTeam({
          id: 'dev-team-abc',
          name: 'Alpha Team',
          code: 'ALP123',
          creator_id: '2',
          members: [
            { id: '1', first_name: 'Ernesto', last_name: 'Developer', avatar_url: null },
            { id: '2', first_name: 'Jane', last_name: 'Doe', avatar_url: null }
          ]
        })
        setInvitations([])
        setSubmitting(false)
        return
      }

      const { error: acceptErr } = await supabase.rpc('accept_team_invitation', {
        invitation_id: invitationId
      })

      if (acceptErr) throw acceptErr

      await fetchTeamData()
    } catch (err: any) {
      const isInvalid = err.message?.includes('Invalid invitation') || err.message?.includes('not found')
      const friendlyMsg = isInvalid ? 'This invite is no longer valid.' : (err.message || 'Failed to accept invitation.')
      setError(friendlyMsg)
      if (isInvalid) {
        await fetchInvitations()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setError(null)
      setSubmitting(true)

      if (!isSupabaseConfigured) {
        setInvitations([])
        setSubmitting(false)
        return
      }

      const { error: declineErr } = await supabase.rpc('decline_team_invitation', {
        invitation_id: invitationId
      })

      if (declineErr) throw declineErr

      await fetchInvitations()
    } catch (err: any) {
      const isInvalid = err.message?.includes('Invalid invitation') || err.message?.includes('not found')
      const friendlyMsg = isInvalid ? 'This invite is no longer valid.' : (err.message || 'Failed to decline invitation.')
      setError(friendlyMsg)
      if (isInvalid) {
        await fetchInvitations()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!teamNameInput.trim()) {
      setError('Please enter a team name.')
      return
    }

    try {
      setError(null)
      setSubmitting(true)

      if (!isSupabaseConfigured) {
        setTeam({
          id: 'dev-team-123',
          name: teamNameInput.trim(),
          code: 'ACM999',
          creator_id: '1',
          members: [{ id: '1', first_name: 'Ernesto', last_name: 'Developer', avatar_url: null }]
        })
        setSubmitting(false)
        return
      }

      const { error: createError } = await supabase.rpc('create_team', {
        team_name: teamNameInput.trim()
      })

      if (createError) throw createError

      setTeamNameInput('')
      await fetchTeamData()
    } catch (err: any) {
      setError(err.message || 'Failed to create team. Ensure the name is unique.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinTeam = async () => {
    if (!joinCodeInput.trim()) {
      setError('Please enter a join code.')
      return
    }

    try {
      setError(null)
      setSubmitting(true)

      if (!isSupabaseConfigured) {
        setTeam({
          id: 'dev-team-123',
          name: 'Tech ACM Team',
          code: joinCodeInput.trim().toUpperCase(),
          creator_id: '1',
          members: [
            { id: '1', first_name: 'Ernesto', last_name: 'Developer', avatar_url: null },
            { id: '2', first_name: 'New', last_name: 'Joiner', avatar_url: null }
          ]
        })
        setSubmitting(false)
        return
      }

      const { error: joinError } = await supabase.rpc('join_team', {
        join_code: joinCodeInput.trim().toUpperCase()
      })

      if (joinError) throw joinError

      setJoinCodeInput('')
      await fetchTeamData()
    } catch (err: any) {
      setError(err.message || 'Failed to join team. Ensure the code is correct and the team has space.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLeaveTeam = async () => {
    try {
      setError(null)
      setSubmitting(true)

      if (!isSupabaseConfigured) {
        setTeam(null)
        setSubmitting(false)
        return
      }

      const { error: leaveError } = await supabase.rpc('leave_team')
      if (leaveError) throw leaveError

      await fetchTeamData()
    } catch (err: any) {
      setError(err.message || 'Failed to leave the team.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKickMember = async (memberId: string) => {
    try {
      setError(null)
      setSubmitting(true)

      if (!isSupabaseConfigured) {
        if (team) {
          setTeam({
            ...team,
            members: team.members.filter(m => m.id !== memberId)
          })
        }
        setSubmitting(false)
        return
      }

      const { error: kickError } = await supabase.rpc('kick_member', {
        member_id: memberId
      })

      if (kickError) throw kickError

      await fetchTeamData()
    } catch (err: any) {
      setError(err.message || 'Failed to kick member.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      setError(null)
      setSubmitting(true)

      if (!isSupabaseConfigured) {
        setSentInvitations(prev => prev.filter(inv => inv.id !== invitationId))
        setSubmitting(false)
        return
      }

      const { error: deleteErr } = await supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId)

      if (deleteErr) throw deleteErr

      await fetchTeamData()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendInvite = async () => {
    const email = inviteEmailInput.trim()
    if (!email) {
      setInviteResult({ status: 'error', message: 'Please enter a valid email address.' })
      return
    }

    try {
      setInviteSubmitting(true)
      setInviteResult(null)

      if (!isSupabaseConfigured) {
        if (email.includes('exist')) {
          setTeam(prev => {
            if (!prev) return null
            return {
              ...prev,
              members: [...prev.members, { id: 'dev-mock-new', first_name: 'Invited', last_name: 'Member', avatar_url: null }]
            }
          })
        } else {
          setSentInvitations(prev => [...prev, { id: 'sent-new-' + Date.now(), email }])
        }
        setShowInviteModal(false)
        return
      }

      const { data, error: inviteError } = await supabase.rpc('invite_user_to_team', {
        email_to_invite: email
      })

      if (inviteError) throw inviteError

      const parsed = typeof data === 'string' ? JSON.parse(data) : data

      if (parsed.status === 'already_in_team') {
        setInviteResult({
          status: 'already_in_team',
          message: `${parsed.name} is already on another team.`
        })
      } else {
        // Trigger email invitation via Edge Function (non-blocking)
        if (team) {
          try {
            await supabase.functions.invoke('invite-user-by-email', {
              body: { email, teamId: team.id }
            })
          } catch (funcErr) {
            console.warn('Could not send invite email (Edge Function might not be deployed yet):', funcErr)
          }
        }

        await fetchTeamData()
        setShowInviteModal(false)
      }
    } catch (err: any) {
      setInviteResult({
        status: 'error',
        message: err.message || 'Failed to send invitation.'
      })
    } finally {
      setInviteSubmitting(false)
    }
  }

  const fallbackCopyText = (text: string) => {
    if (Platform.OS !== 'web') return
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.top = '0'
      textArea.style.left = '0'
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (successful) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Fallback copy failed:', err)
    }
  }

  const handleCopyCode = () => {
    if (!team) return
    const textToCopy = team.code

    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          })
          .catch((err) => {
            console.warn('Modern copy failed, attempting document fallback...', err)
            fallbackCopyText(textToCopy)
          })
      } else {
        fallbackCopyText(textToCopy)
      }
    } else {
      Clipboard.setString(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }



  return (
    <>
      <View style={styles.formContainer}>
          {loading ? (
            <View style={styles.innerCard}>
              <ActivityIndicator size="large" color="#c2b75f" style={{ marginVertical: 32 }} />
              <Text style={{ color: '#666666' }}>Retrieving team details...</Text>
            </View>
          ) : team ? (
            <View style={styles.innerCard}>
              {/* Accountability Warning Banner */}
              {(() => {
                const membersWithChanges = team.members.filter(m => {
                  const apps = membersApplications.filter(a => a.user_id === m.id)
                  return apps.some(a => a.status === 'changes_requested')
                })

                if (membersWithChanges.length === 0) return null

                return (
                  <View style={styles.warningBanner}>
                    <Text style={styles.warningBannerHeader}>ACTION REQUIRED: Application Changes Requested</Text>
                    <Text style={styles.warningBannerSub}>
                      An admin requested changes on team application(s). Please resolve for accountability:
                    </Text>
                    {membersWithChanges.map(member => {
                       const apps = membersApplications.filter(a => a.user_id === member.id)
                       const appWithFeedback = apps.find(a => a.status === 'changes_requested' && a.admin_feedback)
                       
                       let feedback = 'No specific feedback provided.'
                       if (appWithFeedback && appWithFeedback.admin_feedback) {
                         const fbVal = appWithFeedback.admin_feedback
                         if (Array.isArray(fbVal)) {
                           const activeEntry = fbVal.find(f => f && !f.resolved_at)
                           if (activeEntry && activeEntry.feedback) {
                             feedback = activeEntry.feedback
                           } else if (fbVal.length > 0 && fbVal[fbVal.length - 1]?.feedback) {
                             feedback = fbVal[fbVal.length - 1].feedback
                           }
                         } else if (typeof fbVal === 'string') {
                           feedback = fbVal
                         } else if (fbVal && typeof fbVal === 'object' && (fbVal as any).feedback) {
                           feedback = (fbVal as any).feedback
                         }
                       }

                       const name = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Teammate'
                       return (
                         <View key={member.id} style={styles.warningBannerItem}>
                           <Text style={styles.warningBannerName}>• {name}:</Text>
                           <Text style={styles.warningBannerFeedback}>"{feedback}"</Text>
                         </View>
                       )
                    })}
                  </View>
                )
              })()}

              <Text style={styles.titleText}>{team.name}</Text>
              <Text style={styles.subtitleText}>Manage your hackathon team. Invite others using your team code!</Text>

              <Text style={styles.label}>Team Join Code</Text>
              <View style={styles.codeRow}>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{team.code}</Text>
                </View>
                <Pressable onPress={handleCopyCode} style={styles.copyBtn}>
                  <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
                </Pressable>
              </View>

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Members ({team.members.length}/{maxTeamSize})</Text>
              </View>
              {(() => {
                const rows: React.ReactNode[] = []
                
                // 1. Render active members
                team.members.forEach((member) => {
                  if (rows.length >= maxTeamSize) return
                  const first = (member.first_name || '').charAt(0).toUpperCase()
                  const last = (member.last_name || '').charAt(0).toUpperCase()
                  const initials = `${first}${last}`.trim()
                  const isOwner = member.id === team.creator_id
                  const isMe = member.id === userId
                  const overallIndex = rows.length
                  const isLast = overallIndex === maxTeamSize - 1

                  const memberApps = membersApplications.filter(a => a.user_id === member.id)
                  const hasChangesRequested = memberApps.some(a => a.status === 'changes_requested')

                  rows.push(
                    <View 
                      key={`member-${member.id}`} 
                      style={[
                        styles.memberRow,
                        isLast && { borderBottomWidth: 0 }
                      ]}
                    >
                      <View style={styles.memberInitials}>
                        {member.avatar_display_url ? (
                          <Image source={{ uri: member.avatar_display_url }} style={styles.memberAvatarImage} />
                        ) : initials ? (
                          <Text style={styles.memberInitialsText}>{initials}</Text>
                        ) : (
                          <PersonSilhouette size={38} color="#c2b75f" />
                        )}
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.memberName}>
                            {member.first_name || ''} {member.last_name || ''}
                          </Text>
                          {isOwner && (
                            <Text style={styles.ownerBadge}>(Owner)</Text>
                          )}
                          {hasChangesRequested && (
                            <Text style={styles.actionRequiredBadge}>Action Required</Text>
                          )}
                        </View>
                        
                        {!isMe && team.creator_id === userId && (
                          <Pressable 
                            onPress={() => handleKickMember(member.id)} 
                            style={({ pressed }) => [
                              styles.kickBtn,
                              pressed && { opacity: 0.7 }
                            ]}
                          >
                            <Text style={styles.kickBtnText}>Kick</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )
                })

                // 2. Render pending sent invitations
                sentInvitations.forEach((invite) => {
                  if (rows.length >= maxTeamSize) return
                  const overallIndex = rows.length
                  const isLast = overallIndex === maxTeamSize - 1

                  rows.push(
                    <View 
                      key={`invite-${invite.id}`} 
                      style={[
                        styles.memberRow,
                        isLast && { borderBottomWidth: 0 }
                      ]}
                    >
                      <View style={styles.memberInitialsPlaceholder}>
                        <PersonSilhouette size={38} />
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.invitedEmailText} numberOfLines={1}>
                            {invite.email}
                          </Text>
                          <Text style={styles.pendingBadge}>(Invited)</Text>
                        </View>
                        
                        {team.creator_id === userId && (
                          <Pressable 
                            onPress={() => handleCancelInvitation(invite.id)} 
                            style={({ pressed }) => [
                              styles.kickBtn,
                              pressed && { opacity: 0.7 }
                            ]}
                          >
                            <Text style={styles.kickBtnText}>Cancel</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )
                })

                // 3. Render empty slots
                while (rows.length < maxTeamSize) {
                  const overallIndex = rows.length
                  const isLast = overallIndex === maxTeamSize - 1
                  const slotKey = `empty-${overallIndex}`

                  rows.push(
                    <View 
                      key={slotKey} 
                      style={[
                        styles.memberRow,
                        isLast && { borderBottomWidth: 0 }
                      ]}
                    >
                      <View style={styles.memberInitialsPlaceholder}>
                        <PersonSilhouette size={38} />
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                          <Text style={styles.emptySlotText}>Empty Slot</Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setShowInviteModal(true)
                            setInviteEmailInput('')
                            setInviteResult(null)
                          }}
                          style={({ pressed }) => [
                            styles.inviteBtnRight,
                            pressed && { opacity: 0.7 }
                          ]}
                        >
                          <Text style={styles.inviteBtnRightText}>Invite</Text>
                        </Pressable>
                      </View>
                    </View>
                  )
                }

                return rows
              })()}

              <View style={styles.divider} />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <PillButton
                variant="outline-danger"
                title="Leave Team"
                isLoading={submitting}
                onPress={handleLeaveTeam}
              />
            </View>
          ) : (
            <View style={styles.innerCard}>
              <Text style={styles.titleText}>Project Team</Text>
              <Text style={styles.subtitleText}>Form a project team to compete in HackMTY. Teams can have up to {maxTeamSize} members.</Text>

              {error && <Text style={styles.errorText}>{error}</Text>}

              {invitations.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Pending Invitations</Text>
                  {invitations.map((invite, index) => {
                    const isLast = index === invitations.length - 1
                    return (
                      <View 
                        key={invite.id} 
                        style={[
                          styles.inviteRow,
                          isLast && { borderBottomWidth: 0 }
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inviteText}>
                            You have been invited to join <Text style={{ fontWeight: 'bold' }}>{invite.teams?.name || 'a team'}</Text>
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable
                            onPress={() => handleAcceptInvitation(invite.id)}
                            style={styles.acceptBtn}
                          >
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeclineInvitation(invite.id)}
                            style={styles.declineBtn}
                          >
                            <Text style={styles.declineBtnText}>Decline</Text>
                          </Pressable>
                        </View>
                      </View>
                    )
                  })}
                  <View style={styles.divider} />
                </>
              )}

              <Text style={styles.sectionTitle}>Join a Team</Text>
              <View style={styles.inputGroup}>
                <StyledInput
                  label="Enter Join Code"
                  placeholder="e.g. AB12XY"
                  autoCapitalize="characters"
                  value={joinCodeInput}
                  onChangeText={setJoinCodeInput}
                />
              </View>
              <PillButton
                title="Join Team"
                onPress={submitting ? undefined : handleJoinTeam}
                additionalStyle={styles.button}
              />

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Create a Team</Text>
              <View style={styles.inputGroup}>
                <StyledInput
                  label="Team Name"
                  placeholder="Enter unique team name"
                  value={teamNameInput}
                  onChangeText={setTeamNameInput}
                />
              </View>
              <PillButton
                title="Create Team"
                onPress={submitting ? undefined : handleCreateTeam}
                additionalStyle={styles.button}
              />
            </View>
          )}
        </View>

      <Modal
        transparent={true}
        visible={showInviteModal}
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invite Teammate</Text>
            <Text style={styles.modalSubtitle}>
              Enter their email to add them to your team. If they don't have an account, they'll join automatically upon signing up.
            </Text>

            <StyledInput
              label="Email Address"
              placeholder="teammate@example.com"
              value={inviteEmailInput}
              onChangeText={setInviteEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {inviteResult && (
              <Text 
                style={[
                  styles.modalResultText, 
                  inviteResult.status === 'error' || inviteResult.status === 'already_in_team'
                    ? { color: '#ef4444' }
                    : { color: '#10b981' }
                ]}
              >
                {inviteResult.message}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowInviteModal(false)}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </Pressable>

              <PillButton
                variant="secondary"
                title="Send Invite"
                isLoading={inviteSubmitting}
                onPress={handleSendInvite}
                additionalStyle={{ flex: 1, height: 48 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}
