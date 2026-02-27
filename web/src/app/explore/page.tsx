import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ClubCard } from '@/components/explore/ClubCard'
import { TournamentCard } from '@/components/explore/TournamentCard'
import { SearchFilters } from '@/components/explore/SearchFilters'
import { ExploreTabs } from '@/components/explore/ExploreTabs'
import { Trophy, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Explore Cricket Clubs & Tournaments | TossUp',
  description: 'Discover and join cricket clubs and tournaments in your area. Find practice sessions, matches, and community events.',
  openGraph: {
    title: 'Explore Cricket Clubs & Tournaments | TossUp',
    description: 'Discover and join cricket clubs and tournaments in your area.',
  },
}

interface ExplorePageProps {
  searchParams: Promise<{ q?: string; tab?: string }>
}

async function ClubsList({ query }: { query?: string }) {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('clubs')
    .select('id, name, slug, description, location, logo, primary_color, visibility, club_memberships(count)')
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: false })
    .limit(50)

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,location.ilike.%${query}%,description.ilike.%${query}%`)
  }

  const { data: clubs, error } = await dbQuery

  if (error) {
    console.error('Failed to fetch clubs:', error)
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Failed to load clubs. Please try again later.</p>
      </div>
    )
  }

  if (!clubs || clubs.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {query ? 'No clubs found' : 'No public clubs yet'}
        </h3>
        <p className="text-muted-foreground mb-6">
          {query
            ? `No clubs matching "${query}". Try a different search.`
            : 'Be the first to create a public cricket club!'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clubs.map((club) => (
        <ClubCard
          key={club.id}
          id={club.id}
          name={club.name}
          slug={club.slug}
          description={club.description}
          location={club.location}
          logo={club.logo}
          memberCount={(club.club_memberships as unknown as { count: number }[])?.[0]?.count ?? 0}
          visibility={club.visibility}
          primaryColor={club.primary_color}
        />
      ))}
    </div>
  )
}

async function TournamentsList({ query }: { query?: string }) {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('leagues')
    .select('id, name, description, type, venue, start_date, end_date, registration_status, format, tournament_registrations(count)')
    .eq('visibility', 'PUBLIC')
    .order('created_at', { ascending: false })
    .limit(50)

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,venue.ilike.%${query}%,description.ilike.%${query}%`)
  }

  const { data: tournaments, error } = await dbQuery

  if (error) {
    console.error('Failed to fetch tournaments:', error)
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Failed to load tournaments. Please try again later.</p>
      </div>
    )
  }

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="text-center py-16">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {query ? 'No tournaments found' : 'No public tournaments yet'}
        </h3>
        <p className="text-muted-foreground mb-6">
          {query
            ? `No tournaments matching "${query}". Try a different search.`
            : 'Check back soon for upcoming tournaments!'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tournaments.map((t) => (
        <TournamentCard
          key={t.id}
          id={t.id}
          name={t.name}
          description={t.description}
          type={t.type}
          venue={t.venue}
          startDate={t.start_date}
          endDate={t.end_date}
          registrationStatus={t.registration_status}
          registrationCount={(t.tournament_registrations as unknown as { count: number }[])?.[0]?.count ?? 0}
          format={t.format}
        />
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-white/[0.06] rounded animate-pulse" />
              <div className="h-4 w-full bg-white/[0.04] rounded animate-pulse" />
              <div className="h-3 w-24 bg-white/[0.04] rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { q, tab } = await searchParams
  const activeTab = tab === 'tournaments' ? 'tournaments' : 'clubs'

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-blue-400" />
                <span className="text-lg font-bold text-foreground">TossUp</span>
              </Link>
              <span className="text-muted-foreground mx-2">/</span>
              <span className="text-foreground font-medium">Explore</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Discover Cricket
          </h1>
          <p className="text-muted-foreground text-lg">
            Find and join cricket clubs, or discover tournaments in your area.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-xl">
          <Suspense>
            <SearchFilters />
          </Suspense>
        </div>

        {/* Tabs */}
        <Suspense>
          <ExploreTabs activeTab={activeTab} />
        </Suspense>

        {/* Results */}
        {activeTab === 'clubs' ? (
          <Suspense fallback={<ListSkeleton />}>
            <ClubsList query={q} />
          </Suspense>
        ) : (
          <Suspense fallback={<ListSkeleton />}>
            <TournamentsList query={q} />
          </Suspense>
        )}
      </main>
    </div>
  )
}
