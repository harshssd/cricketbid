'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Trophy,
  Users,
  Calendar,
  Plus,
  Search,
  Filter,
  Crown,
  Shield,
  ArrowLeft,
  ExternalLink,
  Star
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { LeagueType, OrganizationRole, Visibility, LeagueStatus } from '@/lib/types'

interface LeagueSummary {
  id: string
  name: string
  description?: string
  code: string
  type: LeagueType
  status: LeagueStatus
  primaryColor: string
  visibility: Visibility
  season?: string
  memberCount: number
  auctionCount: number
  userRole: OrganizationRole
  isOwner: boolean
  createdAt: Date
  lastActivity?: Date
}

const LEAGUE_TYPE_COLORS = {
  TOURNAMENT: 'bg-yellow-100 text-yellow-800',
  SEASONAL: 'bg-blue-100 text-blue-800',
  CHAMPIONSHIP: 'bg-purple-100 text-purple-800'
}

const LEAGUE_STATUS_COLORS = {
  PLANNED: 'bg-orange-100 text-orange-800',
  ONGOING: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800'
}

const VISIBILITY_COLORS = {
  PUBLIC: 'bg-green-100 text-green-800',
  PRIVATE: 'bg-red-100 text-red-800',
  INVITE_ONLY: 'bg-orange-100 text-orange-800'
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [filteredLeagues, setFilteredLeagues] = useState<LeagueSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'owned' | 'member'>('all')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterLeagues()
  }, [leagues, searchQuery, filterType])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/signin')
      return
    }
    setUser(user)
    loadLeagues(user.id)
  }

  const loadLeagues = async (userId: string) => {
    try {
      // Fetch leagues owned by user
      const { data: ownedLeagues, error: ownedError } = await supabase
        .from('leagues')
        .select('*, league_memberships(count), auctions(count)')
        .eq('owner_id', userId)

      if (ownedError) throw ownedError

      // Fetch leagues where user is a member (but not owner)
      const { data: membershipData, error: memberError } = await supabase
        .from('league_memberships')
        .select('league_id, role, leagues(*, league_memberships(count), auctions(count))')
        .eq('user_id', userId)

      if (memberError) throw memberError

      const results: LeagueSummary[] = []

      // Add owned leagues
      for (const league of ownedLeagues || []) {
        results.push({
          id: league.id,
          name: league.name,
          description: league.description,
          code: league.code,
          type: league.type,
          status: league.status || 'PLANNED',
          primaryColor: league.primary_color,
          visibility: league.visibility,
          season: league.season,
          memberCount: league.league_memberships?.[0]?.count ?? 0,
          auctionCount: league.auctions?.[0]?.count ?? 0,
          userRole: 'OWNER',
          isOwner: true,
          createdAt: new Date(league.created_at),
          lastActivity: league.updated_at ? new Date(league.updated_at) : undefined,
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
          description: league.description,
          code: league.code,
          type: league.type,
          status: league.status || 'PLANNED',
          primaryColor: league.primary_color,
          visibility: league.visibility,
          season: league.season,
          memberCount: league.league_memberships?.[0]?.count ?? 0,
          auctionCount: league.auctions?.[0]?.count ?? 0,
          userRole: membership.role,
          isOwner: false,
          createdAt: new Date(league.created_at),
          lastActivity: league.updated_at ? new Date(league.updated_at) : undefined,
        })
      }

      setLeagues(results)
    } catch (error) {
      console.error('Failed to load leagues:', error)
      toast.error('Failed to load leagues')
    } finally {
      setIsLoading(false)
    }
  }

  const filterLeagues = () => {
    let filtered = leagues

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(league =>
        league.name.toLowerCase().includes(query) ||
        league.code.toLowerCase().includes(query) ||
        league.description?.toLowerCase().includes(query)
      )
    }

    // Apply type filter
    if (filterType === 'owned') {
      filtered = filtered.filter(league => league.isOwner)
    } else if (filterType === 'member') {
      filtered = filtered.filter(league => !league.isOwner)
    }

    setFilteredLeagues(filtered)
  }

  const getRoleIcon = (role: OrganizationRole) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'MODERATOR':
        return <Shield className="h-4 w-4 text-green-600" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

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
                  Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">My Leagues</h1>
            </div>
            <Button asChild>
              <Link href="/leagues/create">
                <Plus className="h-4 w-4 mr-2" />
                Create League
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Leagues</p>
                  <p className="text-2xl font-bold text-gray-900">{leagues.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Crown className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Owned</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {leagues.filter(l => l.isOwner).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Member</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {leagues.filter(l => !l.isOwner).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Auctions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {leagues.reduce((sum, l) => sum + l.auctionCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search leagues..."
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
              All ({leagues.length})
            </Button>
            <Button
              variant={filterType === 'owned' ? 'default' : 'outline'}
              onClick={() => setFilterType('owned')}
              size="sm"
            >
              Owned ({leagues.filter(l => l.isOwner).length})
            </Button>
            <Button
              variant={filterType === 'member' ? 'default' : 'outline'}
              onClick={() => setFilterType('member')}
              size="sm"
            >
              Member ({leagues.filter(l => !l.isOwner).length})
            </Button>
          </div>
        </div>

        {/* Leagues Grid */}
        {filteredLeagues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLeagues.map((league) => (
              <Card key={league.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: league.primaryColor }}
                      >
                        {league.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{league.name}</CardTitle>
                        <p className="text-sm text-gray-500">{league.code}</p>
                      </div>
                    </div>
                    {league.isOwner && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {league.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {league.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={LEAGUE_TYPE_COLORS[league.type]}>
                      {league.type}
                    </Badge>
                    <Badge className={LEAGUE_STATUS_COLORS[league.status]}>
                      {league.status}
                    </Badge>
                    <Badge className={VISIBILITY_COLORS[league.visibility]}>
                      {league.visibility}
                    </Badge>
                    <Badge className={getRoleBadgeColor(league.userRole)}>
                      {getRoleIcon(league.userRole)}
                      <span className="ml-1">{league.userRole}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{league.memberCount}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-4 w-4" />
                        <span>{league.auctionCount}</span>
                      </div>
                    </div>
                    {league.season && (
                      <span className="text-xs">{league.season}</span>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button asChild className="flex-1" size="sm">
                      <Link href={`/leagues/${league.code}/dashboard`}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-gray-400 mt-3 pt-3 border-t">
                    {league.lastActivity ? (
                      <>Last active: {league.lastActivity.toLocaleDateString()}</>
                    ) : (
                      <>Created: {league.createdAt.toLocaleDateString()}</>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery.trim() ? 'No leagues found' : 'No leagues yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery.trim()
                ? 'Try adjusting your search or filters'
                : 'Create your first league to get started with organizing cricket auctions'
              }
            </p>
            <Button asChild>
              <Link href="/leagues/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First League
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}