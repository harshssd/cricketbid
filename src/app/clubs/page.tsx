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
  ArrowLeft,
  ExternalLink,
  Star,
  Trophy
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { OrganizationRole, Visibility } from '@/lib/types'

interface ClubSummary {
  id: string
  name: string
  description?: string
  primaryColor: string
  visibility: Visibility
  memberCount: number
  leagueCount: number
  userRole: OrganizationRole
  isOwner: boolean
  createdAt: Date
  lastActivity?: Date
}

const VISIBILITY_COLORS: Record<Visibility, string> = {
  PUBLIC: 'bg-success/10 text-success',
  PRIVATE: 'bg-destructive/10 text-destructive',
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
          primaryColor: club.primary_color,
          visibility: club.visibility,
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
          primaryColor: club.primary_color,
          visibility: club.visibility,
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
        club.description?.toLowerCase().includes(query)
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
        return <Crown className="h-4 w-4 text-warning" />
      default:
        return <Users className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-warning/10 text-warning'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-foreground">My Clubs</h1>
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
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clubs</p>
                  <p className="text-2xl font-bold text-foreground">{clubs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Crown className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Owned</p>
                  <p className="text-2xl font-bold text-foreground">
                    {clubs.filter(c => c.isOwner).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member</p>
                  <p className="text-2xl font-bold text-foreground">
                    {clubs.filter(c => !c.isOwner).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Leagues</p>
                  <p className="text-2xl font-bold text-foreground">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                      </div>
                    </div>
                    {club.isOwner && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {club.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
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

                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
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

                  <div className="flex space-x-2">
                    <Button asChild className="flex-1" size="sm">
                      <Link href={`/clubs/${club.id}/dashboard`}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
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
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery.trim() ? 'No clubs found' : 'No clubs yet'}
            </h3>
            <p className="text-muted-foreground mb-6">
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
