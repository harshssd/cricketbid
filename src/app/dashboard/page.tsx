'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createBrowserClient } from '@supabase/ssr'
import {
  Plus,
  Trophy,
  Users,
  Calendar,
  Settings,
  LogOut,
  Bell,
  Activity,
  Crown,
  Shield,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface DashboardData {
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
  stats: {
    ownedAuctions: number
    participatedAuctions: number
    ownedLeagues: number
    ownedClubs: number
    totalMemberships: number
    pendingInvites: number
  }
  recentActivity: Array<{
    id: string
    type: string
    message: string
    timestamp: Date
  }>
}

interface ClubSummary {
  id: string
  name: string
  slug: string
  primaryColor: string
  memberCount: number
  leagueCount: number
  isOwner: boolean
}

interface LeagueSummary {
  id: string
  name: string
  code: string
  type: string
  status: string
  primaryColor: string
  memberCount: number
  auctionCount: number
  isOwner: boolean
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [clubs, setClubs] = useState<ClubSummary[]>([])
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasConnectionIssue, setHasConnectionIssue] = useState(false)
  const router = useRouter()
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
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      if (!supabase) {
        router.push('/auth/signin')
        return
      }
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Fetch real dashboard data from database

      // Fetch owned clubs with details
      const { data: ownedClubsData } = await supabase
        .from('clubs')
        .select('*, club_memberships(count), leagues!leagues_club_id_fkey(count)')
        .eq('owner_id', user.id)

      // Fetch owned leagues with details
      const { data: ownedLeaguesData } = await supabase
        .from('leagues')
        .select('*, league_memberships(count), auctions(count)')
        .eq('owner_id', user.id)

      // Fetch owned auctions from our API
      let ownedAuctions: any[] = []
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s for cold start compile

        const auctionResponse = await fetch('/api/auctions', {
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (auctionResponse.ok) {
          const auctionData = await auctionResponse.json()
          ownedAuctions = auctionData.auctions || []
          setHasConnectionIssue(false)
        } else {
          console.error('Auctions API returned error:', auctionResponse.status)
          ownedAuctions = []
          setHasConnectionIssue(true)
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error('Auctions API request timed out')
        } else {
          console.error('Failed to fetch auctions from API:', error)
        }
        ownedAuctions = []
        setHasConnectionIssue(true)
      }

      // Fetch club memberships
      const { data: clubMemberships } = await supabase
        .from('club_memberships')
        .select('id')
        .eq('user_id', user.id)

      // Fetch league memberships
      const { data: leagueMemberships } = await supabase
        .from('league_memberships')
        .select('id')
        .eq('user_id', user.id)

      // Fetch auction participations
      const { data: auctionParticipations } = await supabase
        .from('auction_participations')
        .select('id')
        .eq('user_id', user.id)

      const realData: DashboardData = {
        user: {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          image: user.user_metadata?.avatar_url
        },
        stats: {
          ownedAuctions: ownedAuctions?.length || 0,
          participatedAuctions: auctionParticipations?.length || 0,
          ownedLeagues: ownedLeaguesData?.length || 0,
          ownedClubs: ownedClubsData?.length || 0,
          totalMemberships: (clubMemberships?.length || 0) + (leagueMemberships?.length || 0),
          pendingInvites: 0 // TODO: Add invites query when needed
        },
        recentActivity: []
      }

      // Process clubs data
      const clubsData: ClubSummary[] = (ownedClubsData || []).map((club: any) => ({
        id: club.id,
        name: club.name,
        slug: club.slug,
        primaryColor: club.primary_color,
        memberCount: club.club_memberships?.[0]?.count || 0,
        leagueCount: club.leagues?.[0]?.count || 0,
        isOwner: true
      }))

      // Process leagues data
      const leaguesData: LeagueSummary[] = (ownedLeaguesData || []).map((league: any) => ({
        id: league.id,
        name: league.name,
        code: league.code,
        type: league.type,
        status: league.status || 'PLANNED',
        primaryColor: league.primary_color,
        memberCount: league.league_memberships?.[0]?.count || 0,
        auctionCount: league.auctions?.[0]?.count || 0,
        isOwner: true
      }))

      setClubs(clubsData)
      setLeagues(leaguesData)
      setDashboardData(realData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
      router.push('/')
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Failed to sign out')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Failed to load dashboard</h1>
          <Button onClick={loadDashboardData} className="mt-4">Try again</Button>
        </div>
      </div>
    )
  }

  const { user, stats } = dashboardData

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">TossUp</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Bell className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-shrink-0">
                <LogOut className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Connection Issue Banner */}
      {hasConnectionIssue && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  <span className="font-medium">Connection Issue:</span> Unable to load some auction data.
                  Your auctions may not be displayed completely. Please refresh the page or contact support if the issue persists.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600">
            Manage your clubs, organize tournaments, run auctions, and track your cricket activities.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/auction/create">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Create Auction</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Run player auctions with sealed bidding and live streaming
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/leagues/create">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Trophy className="h-5 w-5 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Create League</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Organize a tournament or seasonal league
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/clubs/create">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Create Club</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Manage members, facilities, and organize club activities
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Your Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Link href="/auctions" className="text-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer block">
                    <div className="text-2xl font-bold text-blue-600">{stats.ownedAuctions}</div>
                    <div className="text-sm text-gray-600">Auctions Created</div>
                  </Link>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.participatedAuctions}</div>
                    <div className="text-sm text-gray-600">Auctions Joined</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.ownedLeagues}</div>
                    <div className="text-sm text-gray-600">Leagues Owned</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{stats.ownedClubs}</div>
                    <div className="text-sm text-gray-600">Clubs Owned</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{stats.totalMemberships}</div>
                    <div className="text-sm text-gray-600">Memberships</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pendingInvites}</div>
                    <div className="text-sm text-gray-600">Pending Invites</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            {dashboardData.recentActivity.length > 0 ? (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-6">
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                  <p className="text-gray-500 mb-4">
                    Start by creating your first club, league, or auction to begin managing your cricket activities
                  </p>
                  <Link href="/auction/create">
                    <Button>Create Your First Auction</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Profile & Organizations */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Name</div>
                    <div className="text-sm text-foreground">{user.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Email</div>
                    <div className="text-sm text-foreground">{user.email}</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4" disabled>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile (Coming Soon)
                </Button>
              </CardContent>
            </Card>

            {/* My Clubs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <span>My Clubs ({clubs.length})</span>
                  </CardTitle>
                  <Link href="/clubs/create">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {clubs.length > 0 ? (
                  <div className="space-y-3">
                    {clubs.slice(0, 3).map((club) => (
                      <div key={club.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: club.primaryColor }}
                          >
                            {club.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{club.name}</p>
                            <p className="text-xs text-gray-500">
                              {club.memberCount} members • {club.leagueCount} leagues
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/clubs/${club.slug}/dashboard`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {clubs.length > 3 && (
                      <div className="pt-2 border-t">
                        <Link href="/clubs">
                          <Button variant="ghost" className="w-full text-sm">
                            View all {clubs.length} clubs
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">No clubs yet</p>
                    <Link href="/clubs/create">
                      <Button size="sm">Create Your First Club</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Leagues */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-green-600" />
                    <span>My Leagues ({leagues.length})</span>
                  </CardTitle>
                  <Link href="/leagues/create">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {leagues.length > 0 ? (
                  <div className="space-y-3">
                    {leagues.slice(0, 3).map((league) => (
                      <div key={league.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: league.primaryColor }}
                          >
                            {league.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{league.name}</p>
                            <p className="text-xs text-gray-500">
                              {league.memberCount} members • {league.auctionCount} auctions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/leagues/${league.code}/dashboard`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {leagues.length > 3 && (
                      <div className="pt-2 border-t">
                        <Link href="/leagues">
                          <Button variant="ghost" className="w-full text-sm">
                            View all {leagues.length} leagues
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">No leagues yet</p>
                    <Link href="/leagues/create">
                      <Button size="sm">Create Your First League</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}