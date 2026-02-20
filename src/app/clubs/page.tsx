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
  Shield,
  Users,
  Calendar,
  Plus,
  Search,
  Filter,
  Crown,
  Settings,
  ArrowLeft,
  ExternalLink,
  Star,
  MapPin,
  Globe,
  Trophy
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { OrganizationRole, Visibility } from '@/lib/types'

interface ClubSummary {
  id: string
  name: string
  description?: string
  code: string
  primaryColor: string
  visibility: Visibility
  location?: string
  website?: string
  memberCount: number
  leagueCount: number
  userRole: OrganizationRole
  isOwner: boolean
  createdAt: Date
  lastActivity?: Date
}

const VISIBILITY_COLORS = {
  PUBLIC: 'bg-green-100 text-green-800',
  PRIVATE: 'bg-red-100 text-red-800',
  INVITE_ONLY: 'bg-orange-100 text-orange-800'
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<ClubSummary[]>([])
  const [filteredClubs, setFilteredClubs] = useState<ClubSummary[]>([])
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
    filterClubs()
  }, [clubs, searchQuery, filterType])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/signin')
      return
    }
    setUser(user)
    loadClubs(user.id)
  }

  const loadClubs = async (userId: string) => {
    try {
      // Fetch clubs owned by user
      const { data: ownedClubs, error: ownedError } = await supabase
        .from('clubs')
        .select('*, club_memberships(count), leagues!leagues_club_id_fkey(count)')
        .eq('owner_id', userId)

      if (ownedError) throw ownedError

      // Fetch clubs where user is a member (but not owner)
      const { data: membershipData, error: memberError } = await supabase
        .from('club_memberships')
        .select('club_id, role, clubs(*, club_memberships(count), leagues!leagues_club_id_fkey(count))')
        .eq('user_id', userId)

      if (memberError) throw memberError

      const results: ClubSummary[] = []

      // Add owned clubs
      for (const club of ownedClubs || []) {
        results.push({
          id: club.id,
          name: club.name,
          description: club.description,
          code: club.slug,
          primaryColor: club.primary_color,
          visibility: club.visibility,
          location: club.location,
          website: club.website,
          memberCount: club.club_memberships?.[0]?.count ?? 0,
          leagueCount: club.leagues?.[0]?.count ?? 0,
          userRole: 'OWNER',
          isOwner: true,
          createdAt: new Date(club.created_at),
          lastActivity: club.updated_at ? new Date(club.updated_at) : undefined,
        })
      }

      // Add member clubs (avoid duplicates if user is both owner and member)
      const ownedIds = new Set(results.map(c => c.id))
      for (const membership of membershipData || []) {
        const club = membership.clubs as any
        if (!club || ownedIds.has(club.id)) continue
        results.push({
          id: club.id,
          name: club.name,
          description: club.description,
          code: club.slug,
          primaryColor: club.primary_color,
          visibility: club.visibility,
          location: club.location,
          website: club.website,
          memberCount: club.club_memberships?.[0]?.count ?? 0,
          leagueCount: club.leagues?.[0]?.count ?? 0,
          userRole: membership.role,
          isOwner: false,
          createdAt: new Date(club.created_at),
          lastActivity: club.updated_at ? new Date(club.updated_at) : undefined,
        })
      }

      setClubs(results)
    } catch (error) {
      console.error('Failed to load clubs:', error)
      toast.error('Failed to load clubs')
    } finally {
      setIsLoading(false)
    }
  }

  const filterClubs = () => {
    let filtered = clubs

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(club =>
        club.name.toLowerCase().includes(query) ||
        club.code.toLowerCase().includes(query) ||
        club.description?.toLowerCase().includes(query) ||
        club.location?.toLowerCase().includes(query)
      )
    }

    // Apply type filter
    if (filterType === 'owned') {
      filtered = filtered.filter(club => club.isOwner)
    } else if (filterType === 'member') {
      filtered = filtered.filter(club => !club.isOwner)
    }

    setFilteredClubs(filtered)
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
              <h1 className="text-2xl font-bold text-gray-900">My Clubs</h1>
            </div>
            <Button asChild>
              <Link href="/clubs/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Club
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
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Clubs</p>
                  <p className="text-2xl font-bold text-gray-900">{clubs.length}</p>
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
                    {clubs.filter(c => c.isOwner).length}
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
                    {clubs.filter(c => !c.isOwner).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Leagues</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {clubs.reduce((sum, c) => sum + c.leagueCount, 0)}
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
              placeholder="Search clubs..."
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
              All ({clubs.length})
            </Button>
            <Button
              variant={filterType === 'owned' ? 'default' : 'outline'}
              onClick={() => setFilterType('owned')}
              size="sm"
            >
              Owned ({clubs.filter(c => c.isOwner).length})
            </Button>
            <Button
              variant={filterType === 'member' ? 'default' : 'outline'}
              onClick={() => setFilterType('member')}
              size="sm"
            >
              Member ({clubs.filter(c => !c.isOwner).length})
            </Button>
          </div>
        </div>

        {/* Clubs Grid */}
        {filteredClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => (
              <Card key={club.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: club.primaryColor }}
                      >
                        {club.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{club.name}</CardTitle>
                        <p className="text-sm text-gray-500">{club.code}</p>
                      </div>
                    </div>
                    {club.isOwner && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {club.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {club.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={VISIBILITY_COLORS[club.visibility]}>
                      {club.visibility}
                    </Badge>
                    <Badge className={getRoleBadgeColor(club.userRole)}>
                      {getRoleIcon(club.userRole)}
                      <span className="ml-1">{club.userRole}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{club.memberCount}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-4 w-4" />
                        <span>{club.leagueCount}</span>
                      </div>
                    </div>
                  </div>

                  {(club.location || club.website) && (
                    <div className="flex items-center space-x-3 text-sm text-gray-500 mb-4">
                      {club.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{club.location}</span>
                        </div>
                      )}
                      {club.website && (
                        <div className="flex items-center space-x-1">
                          <Globe className="h-4 w-4" />
                          <a
                            href={club.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            Website
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button asChild className="flex-1" size="sm">
                      <Link href={`/clubs/${club.code}/dashboard`}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-gray-400 mt-3 pt-3 border-t">
                    {club.lastActivity ? (
                      <>Last active: {club.lastActivity.toLocaleDateString()}</>
                    ) : (
                      <>Created: {club.createdAt.toLocaleDateString()}</>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery.trim() ? 'No clubs found' : 'No clubs yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery.trim()
                ? 'Try adjusting your search or filters'
                : 'Create your first club to start organizing cricket activities and auctions'
              }
            </p>
            <Button asChild>
              <Link href="/clubs/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Club
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}