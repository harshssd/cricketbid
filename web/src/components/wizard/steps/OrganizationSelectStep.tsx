'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Trophy,
  Users,
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { OrganizationRole } from '@/lib/types'
import Link from 'next/link'

interface OrganizationOption {
  id: string
  name: string
  type: 'league'
  memberCount: number
  auctionCount: number
  userRole: OrganizationRole
  description?: string
}

interface OrganizationSelectStepProps {
  data: {
    organizationId?: string
    organizationName?: string
    restrictToMembers?: boolean
  }
  onUpdate: (data: any) => void
  onNext: () => void
  onPrev: () => void
  isValid: boolean
  errors?: Record<string, string[]>
}

export function OrganizationSelectStep({
  data,
  onUpdate,
  onNext,
  onPrev,
  isValid,
  errors,
}: OrganizationSelectStepProps) {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [filteredOrganizations, setFilteredOrganizations] = useState<OrganizationOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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
  }, [organizations, searchQuery])

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
          type: 'league',
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

        results.push({
          id: league.id,
          name: league.name,
          type: 'league',
          memberCount: league.league_memberships?.[0]?.count ?? 0,
          auctionCount: league.auctions?.[0]?.count ?? 0,
          userRole: membership.role as OrganizationRole,
          description: league.description,
        })
      }

      setOrganizations(results)

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
        org.description?.toLowerCase().includes(query)
      )
    }

    setFilteredOrganizations(filtered)
  }

  const handleOrganizationSelect = (org: OrganizationOption) => {
    onUpdate({
      ...data,
      leagueId: org.id,
      leagueName: org.name,
      organizationId: org.id,
      organizationName: org.name,
      restrictToMembers: false
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your organizations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Organization Selection */}
      <div className="space-y-6">
        <div>
          <Label className="text-lg font-semibold mb-4 block">
            Select League
          </Label>

          {organizations.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't belong to any leagues where you can create auctions.
                Create a league first to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leagues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
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
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleOrganizationSelect(org)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold bg-primary text-primary-foreground"
                            >
                              {org.name.charAt(0)}
                            </div>
                            <div>
                              <CardTitle className="text-base">{org.name}</CardTitle>
                            </div>
                          </div>
                          {data.organizationId === org.id && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {org.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {org.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
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
                            <Badge variant="secondary" className="text-xs">
                              {org.userRole}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No leagues found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'Try adjusting your search terms' : 'You need to be a member of a league to create auctions under it'}
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
                  id="restrictToMembers"
                  checked={data.restrictToMembers || false}
                  onChange={(e) => onUpdate({ ...data, restrictToMembers: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <Label htmlFor="restrictToMembers" className="text-sm">
                  Restrict participation to organization members only
                </Label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No Organizations CTA */}
      {organizations.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You don't have any leagues where you can create auctions.
              Create a league first.
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
          disabled={!isValid || !data.organizationId}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
