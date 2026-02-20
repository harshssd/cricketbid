'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Trophy,
  Shield,
  Users,
  Search,
  Plus,
  Crown,
  Settings,
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { AuctionCreationType, OrganizationRole } from '@/lib/types'
import Link from 'next/link'

interface OrganizationOption {
  id: string
  name: string
  code: string
  type: 'league'
  primaryColor: string
  memberCount: number
  auctionCount: number
  userRole: OrganizationRole
  description?: string
}

interface OrganizationSelectStepProps {
  data: {
    creationType?: AuctionCreationType
    organizationId?: string
    organizationName?: string
    inheritBranding?: boolean
    restrictToMembers?: boolean
  }
  onUpdate: (data: any) => void
  onNext: () => void
  onPrev: () => void
  isValid: boolean
  errors?: Record<string, string[]>
  preselectedLeagueCode?: string
}

export function OrganizationSelectStep({
  data,
  onUpdate,
  onNext,
  onPrev,
  isValid,
  errors,
  preselectedLeagueCode
}: OrganizationSelectStepProps) {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [filteredOrganizations, setFilteredOrganizations] = useState<OrganizationOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'leagues'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Create supabase client only if environment variables are configured
  const supabase = typeof window !== 'undefined' &&
                   process.env.NEXT_PUBLIC_SUPABASE_URL &&
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
                   !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') ?
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ) : null

  useEffect(() => {
    loadUserOrganizations()
  }, [])

  useEffect(() => {
    filterOrganizations()
  }, [organizations, searchQuery, filterType])

  const loadUserOrganizations = async () => {
    try {
      if (!supabase) {
        console.warn('Supabase client not available, using mock data')
        setOrganizations([])
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('User not authenticated')
        setOrganizations([])
        return
      }

      setUser(user)
      const results: OrganizationOption[] = []

      // Fetch leagues owned by user
      const { data: ownedLeagues, error: ownedError } = await supabase
        .from('leagues')
        .select('*, league_memberships(count), auctions(count)')
        .eq('owner_id', user.id)

      if (ownedError) throw ownedError

      // Fetch leagues where user is a member (but not owner)
      const { data: membershipData, error: memberError } = await supabase
        .from('league_memberships')
        .select('role, leagues(*, league_memberships(count), auctions(count))')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      // Add owned leagues
      for (const league of ownedLeagues || []) {
        results.push({
          id: league.id,
          name: league.name,
          code: league.code,
          type: 'league',
          primaryColor: league.primary_color,
          memberCount: league.league_memberships?.[0]?.count ?? 0,
          auctionCount: league.auctions?.[0]?.count ?? 0,
          userRole: 'OWNER',
          description: league.description,
        })
      }

      // Add member leagues (avoid duplicates if user is both owner and member)
      const ownedIds = new Set(results.map(l => l.id))
      for (const membership of membershipData || []) {
        const league = membership.leagues as any
        if (!league || ownedIds.has(league.id)) continue

        // Only include leagues where user has permission to create auctions
        if (membership.role === 'ADMIN' || membership.role === 'MODERATOR') {
          results.push({
            id: league.id,
            name: league.name,
            code: league.code,
            type: 'league',
            primaryColor: league.primary_color,
            memberCount: league.league_memberships?.[0]?.count ?? 0,
            auctionCount: league.auctions?.[0]?.count ?? 0,
            userRole: membership.role,
            description: league.description,
          })
        }
      }

      // Filter to only show organizations where user can create auctions
      const allowedOrganizations = results.filter(org =>
        org.userRole === 'OWNER' || org.userRole === 'ADMIN' || org.userRole === 'MODERATOR'
      )

      setOrganizations(allowedOrganizations)

      // Auto-select league if preselected via URL param
      if (preselectedLeagueCode && !data.organizationId) {
        const matchingOrg = allowedOrganizations.find(
          org => org.code.toUpperCase() === preselectedLeagueCode.toUpperCase()
        )
        if (matchingOrg) {
          onUpdate({
            creationType: 'LEAGUE',
            organizationId: matchingOrg.id,
            organizationName: matchingOrg.name,
            organizationCode: matchingOrg.code,
            organizationType: 'league',
            inheritBranding: true,
            restrictToMembers: false
          })
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
      setOrganizations([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterOrganizations = () => {
    let filtered = organizations

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(query) ||
        org.code.toLowerCase().includes(query) ||
        org.description?.toLowerCase().includes(query)
      )
    }

    // Apply type filter
    if (filterType === 'leagues') {
      filtered = filtered.filter(org => org.type === 'league')
    }

    setFilteredOrganizations(filtered)
  }

  const handleCreationTypeChange = (type: AuctionCreationType) => {
    onUpdate({
      creationType: type,
      organizationId: type === 'STANDALONE' ? undefined : data.organizationId,
      organizationName: type === 'STANDALONE' ? undefined : data.organizationName,
      inheritBranding: type !== 'STANDALONE' ? true : false,
      restrictToMembers: type !== 'STANDALONE' ? false : false
    })
  }

  const handleOrganizationSelect = (org: OrganizationOption) => {
    onUpdate({
      ...data,
      organizationId: org.id,
      organizationName: org.name,
      organizationCode: org.code,
      organizationType: org.type,
      inheritBranding: true,
      restrictToMembers: false
    })
  }

  const getRoleIcon = (role: OrganizationRole) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'MODERATOR':
        return <Settings className="h-4 w-4 text-green-600" />
      default:
        return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-100 text-yellow-800'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800'
      case 'MODERATOR':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your organizations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Creation Type Selection */}
      <div>
        <Label className="text-lg font-semibold mb-4 block">
          Where would you like to create this auction?
        </Label>
        <RadioGroup
          value={data.creationType || ''}
          onValueChange={(value) => handleCreationTypeChange(value as AuctionCreationType)}
          className="space-y-4"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="STANDALONE" id="standalone" />
            <Label htmlFor="standalone" className="cursor-pointer flex-1">
              <Card className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                data.creationType === 'STANDALONE' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''
              }`}>
                <div className="flex items-start space-x-3">
                  <Trophy className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Standalone Auction</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Create an independent auction not tied to any organization. You have complete control over settings and members.
                    </p>
                  </div>
                </div>
              </Card>
            </Label>
          </div>

          {organizations.length > 0 && (
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="LEAGUE" id="organization" />
              <Label htmlFor="organization" className="cursor-pointer flex-1">
                <Card className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  data.creationType === 'LEAGUE' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''
                }`}>
                  <div className="flex items-start space-x-3">
                    <Shield className="h-6 w-6 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold">League Auction</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Create an auction under one of your leagues. Members of the league can participate automatically.
                      </p>
                    </div>
                  </div>
                </Card>
              </Label>
            </div>
          )}
        </RadioGroup>
      </div>

      {/* Organization Selection */}
      {(data.creationType === 'LEAGUE' ||
        (data.creationType !== 'STANDALONE' && organizations.length > 0)) && (
        <div className="space-y-6">
          <div>
            <Label className="text-lg font-semibold mb-4 block">
              Select Organization
            </Label>

            {organizations.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don't belong to any organizations where you can create auctions.
                  You need at least Moderator role to create auctions in an organization.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search organizations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filterType === 'all' ? 'default' : 'outline'}
                      onClick={() => setFilterType('all')}
                      size="sm"
                    >
                      All ({organizations.length})
                    </Button>
                    <Button
                      variant={filterType === 'leagues' ? 'default' : 'outline'}
                      onClick={() => setFilterType('leagues')}
                      size="sm"
                    >
                      Leagues ({organizations.filter(o => o.type === 'league').length})
                    </Button>
                  </div>
                </div>

                {/* Organizations List */}
                {filteredOrganizations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredOrganizations.map((org) => (
                      <Card
                        key={org.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          data.organizationId === org.id
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleOrganizationSelect(org)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: org.primaryColor }}
                              >
                                {org.name.charAt(0)}
                              </div>
                              <div>
                                <CardTitle className="text-base">{org.name}</CardTitle>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{org.code}</p>
                              </div>
                            </div>
                            {data.organizationId === org.id && (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {org.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {org.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>{org.memberCount}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Trophy className="h-4 w-4" />
                                <span>{org.auctionCount}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className="text-xs capitalize bg-blue-100 text-blue-800">
                                {org.type}
                              </Badge>
                              <Badge className={`text-xs ${getRoleBadgeColor(org.userRole)}`}>
                                {getRoleIcon(org.userRole)}
                                <span className="ml-1">{org.userRole}</span>
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery ? 'Try adjusting your search terms' : 'You need to be a member of an organization to create auctions under it'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Organization Options */}
          {data.organizationId && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Organization Settings</Label>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="inheritBranding"
                    checked={data.inheritBranding || false}
                    onChange={(e) => onUpdate({ ...data, inheritBranding: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <Label htmlFor="inheritBranding" className="text-sm">
                    Use organization's branding and colors
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="restrictToMembers"
                    checked={data.restrictToMembers || false}
                    onChange={(e) => onUpdate({ ...data, restrictToMembers: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <Label htmlFor="restrictToMembers" className="text-sm">
                    Restrict participation to organization members only
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Organizations CTA */}
      {organizations.length === 0 && data.creationType !== 'STANDALONE' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You don't have any leagues where you can create auctions.
              Create a league first, or proceed with a standalone auction.
            </span>
            <div className="flex space-x-2 ml-4">
              <Button asChild size="sm" variant="outline">
                <Link href="/leagues/create">
                  <Plus className="h-4 w-4 mr-1" />
                  League
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Messages */}
      {errors?.creationType && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.creationType}</AlertDescription>
        </Alert>
      )}

      {errors?.organizationId && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.organizationId}</AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrev}>
          Previous
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid || !data.creationType ||
            (data.creationType !== 'STANDALONE' && !data.organizationId)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}