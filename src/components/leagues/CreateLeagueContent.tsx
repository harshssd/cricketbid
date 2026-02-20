'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Calendar,
  Users,
  Settings,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Palette
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { LeagueType, LeagueData, Visibility } from '@/lib/types'

interface LeagueFormData extends LeagueData {
  // Additional form-specific fields
  inviteEmails: string[]
  autoApprove: boolean
  allowTeamCreation: boolean
  clubId?: string
}

const LEAGUE_TYPES: Array<{ value: LeagueType; label: string; description: string; icon: typeof Trophy }> = [
  {
    value: 'TOURNAMENT',
    label: 'Tournament',
    description: 'Single elimination or round-robin tournament format',
    icon: Trophy
  },
  {
    value: 'SEASONAL',
    label: 'Seasonal League',
    description: 'Regular season with multiple matches and ongoing competition',
    icon: Calendar
  },
  {
    value: 'CHAMPIONSHIP',
    label: 'Championship',
    description: 'Elite competition with qualification requirements',
    icon: Sparkles
  }
]

const VISIBILITY_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Anyone can find and join your league'
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Only invited members can join'
  },
  {
    value: 'INVITE_ONLY',
    label: 'Invite Only',
    description: 'Visible to all but requires invitation to join'
  }
]

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
]

export default function CreateLeagueContent() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [availableClubs, setAvailableClubs] = useState<Array<{id: string, name: string, slug: string}>>([])
  const [preSelectedClub, setPreSelectedClub] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [formData, setFormData] = useState<LeagueFormData>({
    name: '',
    description: '',
    code: '',
    type: 'SEASONAL',
    primaryColor: '#3B82F6',
    visibility: 'PUBLIC',
    season: '',
    maxTeams: 8,
    inviteEmails: [],
    autoApprove: true,
    allowTeamCreation: true,
    settings: {}
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/signin')
      return
    }
    setUser(user)

    // Load available clubs where user has permission to create leagues
    await loadAvailableClubs(user.id)

    // Check for pre-selected club from URL
    const clubParam = searchParams.get('club')
    if (clubParam) {
      setPreSelectedClub(clubParam)
      // Find club by slug and set clubId in form data
      const club = await findClubBySlug(clubParam)
      if (club) {
        handleInputChange('clubId', club.id)
      }
    }
  }

  const loadAvailableClubs = async (userId: string) => {
    try {
      // Get clubs where user is owner or admin
      const { data: ownedClubs } = await supabase
        .from('clubs')
        .select('id, name, slug')
        .eq('owner_id', userId)

      const { data: memberClubs } = await supabase
        .from('club_memberships')
        .select('clubs(id, name, slug)')
        .eq('user_id', userId)
        .in('role', ['ADMIN', 'MODERATOR'])

      const allClubs = [
        ...(ownedClubs || []),
        ...(memberClubs || []).map((m: any) => m.clubs).filter(Boolean)
      ]

      // Remove duplicates
      const uniqueClubs = allClubs.filter((club, index, self) =>
        club && index === self.findIndex((c) => c && c.id === club.id)
      )

      setAvailableClubs(uniqueClubs)
    } catch (error) {
      console.error('Failed to load clubs:', error)
    }
  }

  const findClubBySlug = async (slug: string) => {
    const { data: club } = await supabase
      .from('clubs')
      .select('id, name, slug')
      .eq('slug', slug.toUpperCase())
      .single()

    return club
  }

  const generateLeagueCode = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6) + Math.random().toString(36).substring(2, 5).toUpperCase()
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Auto-generate code when name changes
    if (field === 'name' && value) {
      setFormData(prev => ({
        ...prev,
        code: generateLeagueCode(value)
      }))
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name?.trim()) {
          setError('League name is required')
          return false
        }
        if (!formData.code?.trim()) {
          setError('League code is required')
          return false
        }
        if (!formData.type) {
          setError('League type is required')
          return false
        }
        break
      case 2:
        if (!formData.visibility) {
          setError('Visibility setting is required')
          return false
        }
        if (formData.maxTeams && (formData.maxTeams < 2 || formData.maxTeams > 64)) {
          setError('Maximum teams must be between 2 and 64')
          return false
        }
        break
    }
    setError('')
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return
    if (!user) return

    setIsLoading(true)
    setError('')

    try {
      // Insert league
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .insert({
          name: formData.name,
          description: formData.description || null,
          code: formData.code,
          type: formData.type,
          owner_id: user.id,
          club_id: formData.clubId || null,
          primary_color: formData.primaryColor,
          visibility: (formData.visibility as string) === 'INVITE_ONLY' ? 'PRIVATE' : formData.visibility,
          season: formData.season || null,
          max_teams: formData.maxTeams || null,
          settings: {
            autoApprove: formData.autoApprove,
            allowTeamCreation: formData.allowTeamCreation,
          },
        })
        .select()
        .single()

      if (leagueError) throw leagueError

      // Add owner as a member with OWNER role
      const { error: memberError } = await supabase
        .from('league_memberships')
        .insert({
          league_id: league.id,
          user_id: user.id,
          role: 'OWNER',
        })

      if (memberError) throw memberError

      // Insert invites if any
      if (formData.inviteEmails.length > 0) {
        const invites = formData.inviteEmails.map(email => ({
          league_id: league.id,
          email,
          role: 'MEMBER' as const,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }))

        const { error: inviteError } = await supabase
          .from('league_invites')
          .insert(invites)

        if (inviteError) console.error('Failed to create invites:', inviteError)
      }

      setSuccess('League created successfully!')
      toast.success('League created successfully!')

      // Redirect to league dashboard
      setTimeout(() => {
        router.push(`/leagues/${formData.code}/dashboard`)
      }, 1000)
    } catch (error: any) {
      console.error('League creation error:', error)
      if (error?.code === '23505') {
        setError('A league with this code already exists. Please choose a different code.')
      } else {
        setError('Failed to create league. Please try again.')
      }
      toast.error('Failed to create league')
    } finally {
      setIsLoading(false)
    }
  }

  const addInviteEmail = (email: string) => {
    if (email && !formData.inviteEmails.includes(email)) {
      setFormData(prev => ({
        ...prev,
        inviteEmails: [...prev.inviteEmails, email]
      }))
    }
  }

  const removeInviteEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      inviteEmails: prev.inviteEmails.filter(e => e !== email)
    }))
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const steps = [
    { number: 1, title: 'Basic Info', description: 'League name and type' },
    { number: 2, title: 'Configuration', description: 'Settings and visibility' },
    { number: 3, title: 'Branding', description: 'Colors and appearance' },
    { number: 4, title: 'Invitations', description: 'Invite members' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Create League</h1>
            </div>
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep >= step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}>
                    {currentStep > step.number ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      w-12 h-0.5 mx-2
                      ${currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Step {currentStep}: {steps[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">{steps[currentStep - 1].description}</p>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-base font-medium">
                    League Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Premier Cricket League"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="code" className="text-base font-medium">
                    League Code *
                  </Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    placeholder="e.g., PCL2024"
                    className="mt-2 font-mono"
                    maxLength={10}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Unique identifier for your league (auto-generated from name)
                  </p>
                </div>

                <div>
                  <Label className="text-base font-medium">League Type *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    {LEAGUE_TYPES.map((type) => {
                      const IconComponent = type.icon
                      return (
                        <div
                          key={type.value}
                          className={`
                            p-4 border-2 rounded-lg cursor-pointer transition-all
                            ${formData.type === type.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                          onClick={() => handleInputChange('type', type.value)}
                        >
                          <div className="flex items-center space-x-3">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                            <div>
                              <h3 className="font-medium">{type.label}</h3>
                              <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-base font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Tell people what your league is about..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Visibility *</Label>
                  <div className="grid grid-cols-1 gap-4 mt-3">
                    {VISIBILITY_OPTIONS.map((visibility) => (
                      <div
                        key={visibility.value}
                        className={`
                          p-4 border-2 rounded-lg cursor-pointer transition-all
                          ${formData.visibility === visibility.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => handleInputChange('visibility', visibility.value)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{visibility.label}</h3>
                            <p className="text-sm text-gray-500 mt-1">{visibility.description}</p>
                          </div>
                          {formData.visibility === visibility.value && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="maxTeams" className="text-base font-medium">
                      Maximum Teams
                    </Label>
                    <Input
                      id="maxTeams"
                      type="number"
                      value={formData.maxTeams || ''}
                      onChange={(e) => handleInputChange('maxTeams', parseInt(e.target.value) || undefined)}
                      placeholder="8"
                      min="2"
                      max="64"
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Leave empty for unlimited teams
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="season" className="text-base font-medium">
                      Season/Year
                    </Label>
                    <Input
                      id="season"
                      value={formData.season || ''}
                      onChange={(e) => handleInputChange('season', e.target.value)}
                      placeholder="2024"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoApprove"
                      checked={formData.autoApprove}
                      onChange={(e) => handleInputChange('autoApprove', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <Label htmlFor="autoApprove" className="text-base">
                      Auto-approve join requests
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="allowTeamCreation"
                      checked={formData.allowTeamCreation}
                      onChange={(e) => handleInputChange('allowTeamCreation', e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <Label htmlFor="allowTeamCreation" className="text-base">
                      Allow members to create teams
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Branding */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium">Primary Color</Label>
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-3 mb-4">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`
                            w-10 h-10 rounded-lg border-2 transition-all
                            ${formData.primaryColor === color
                              ? 'border-gray-400 scale-110'
                              : 'border-gray-200 hover:scale-105'
                            }
                          `}
                          style={{ backgroundColor: color }}
                          onClick={() => handleInputChange('primaryColor', color)}
                        />
                      ))}
                    </div>
                    <div className="flex items-center space-x-3">
                      <Input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                        placeholder="#3B82F6"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium">League Logo</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-2">
                        Upload your league logo
                      </p>
                      <Button variant="outline" size="sm" disabled>
                        Choose File
                      </Button>
                      <p className="text-xs text-gray-400 mt-2">
                        PNG, JPG up to 2MB
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Banner Image</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-2">
                        Upload banner image
                      </p>
                      <Button variant="outline" size="sm" disabled>
                        Choose File
                      </Button>
                      <p className="text-xs text-gray-400 mt-2">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <Label className="text-base font-medium">Preview</Label>
                  <div className="mt-3 border rounded-lg p-4" style={{ backgroundColor: `${formData.primaryColor}20` }}>
                    <div className="flex items-center space-x-3 mb-2">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: formData.primaryColor }}
                      >
                        {formData.name.charAt(0) || 'L'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{formData.name || 'Your League Name'}</h3>
                        <p className="text-sm text-gray-600">{formData.code || 'LEAGUE_CODE'}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formData.description || 'League description will appear here...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Invitations */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Invite Members</h3>
                  <p className="text-gray-600">
                    Invite people to join your league. You can always add more members later.
                  </p>
                </div>

                <div>
                  <Label htmlFor="inviteEmail" className="text-base font-medium">
                    Email Invitations
                  </Label>
                  <div className="mt-2">
                    <div className="flex space-x-2">
                      <Input
                        id="inviteEmail"
                        type="email"
                        placeholder="Enter email address"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const email = (e.target as HTMLInputElement).value
                            if (email) {
                              addInviteEmail(email)
                              ;(e.target as HTMLInputElement).value = ''
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('inviteEmail') as HTMLInputElement
                          const email = input.value
                          if (email) {
                            addInviteEmail(email)
                            input.value = ''
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Press Enter or click Add to include an email
                    </p>
                  </div>

                  {formData.inviteEmails.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium text-gray-700">
                        Invited Members ({formData.inviteEmails.length})
                      </Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.inviteEmails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="px-3 py-1 flex items-center space-x-2"
                          >
                            <span>{email}</span>
                            <button
                              onClick={() => removeInviteEmail(email)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Skip for now?</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        You can create the league without inviting anyone and add members later
                        from the league dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <Alert variant="destructive" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-8 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex space-x-3">
                {currentStep < 4 && (
                  <Button onClick={nextStep}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                {currentStep === 4 && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating League...
                      </>
                    ) : (
                      <>
                        Create League
                        <Trophy className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}