import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { JoinClubButton } from '@/components/explore/JoinClubButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Trophy,
  MapPin,
  Users,
  Globe,
  Mail,
  ArrowLeft,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface ClubProfilePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ClubProfilePageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: club } = await supabase
    .from('clubs')
    .select('name, description, location')
    .eq('slug', slug)
    .eq('visibility', 'PUBLIC')
    .maybeSingle()

  if (!club) {
    return { title: 'Club Not Found | TossUp' }
  }

  const description = club.description || `${club.name} cricket club on TossUp`

  return {
    title: `${club.name} | TossUp`,
    description,
    openGraph: {
      title: `${club.name} | TossUp`,
      description,
    },
  }
}

export default async function ClubProfilePage({ params }: ClubProfilePageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const user = await getUser()

  // Fetch club with member count and leagues
  const { data: club, error } = await supabase
    .from('clubs')
    .select(`
      id, name, slug, description, location, website, logo, banner, primary_color,
      visibility, contact_email, social_links, created_at,
      club_memberships(count),
      leagues(id, name, type, visibility, start_date, end_date, created_at)
    `)
    .eq('slug', slug)
    .eq('visibility', 'PUBLIC')
    .maybeSingle()

  if (error || !club) {
    notFound()
  }

  const memberCount = (club.club_memberships as unknown as { count: number }[])?.[0]?.count ?? 0
  const leagues = (club.leagues || []) as Array<{
    id: string
    name: string
    type: string
    visibility: string
    start_date: string | null
    end_date: string | null
    created_at: string
  }>
  const publicLeagues = leagues.filter(l => l.visibility === 'PUBLIC')

  // Check if current user is a member
  let isMember = false
  if (user) {
    const { data: membership } = await supabase
      .from('club_memberships')
      .select('id')
      .eq('club_id', club.id)
      .eq('user_id', user.id)
      .maybeSingle()
    isMember = !!membership
  }

  const socialLinks = (club.social_links || {}) as Record<string, string>

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Link href="/explore">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Explore
                </Button>
              </Link>
            </div>
            <JoinClubButton
              clubId={club.id}
              isMember={isMember}
              isAuthenticated={!!user}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Club Hero */}
        <div className="mb-8">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20 rounded-xl shrink-0">
              <AvatarImage src={club.logo || undefined} alt={club.name} />
              <AvatarFallback
                className="rounded-xl text-white font-bold text-3xl"
                style={{ backgroundColor: club.primary_color }}
              >
                {club.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{club.name}</h1>
              {club.description && (
                <p className="text-muted-foreground mt-2 max-w-2xl">{club.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                {club.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {club.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Since {new Date(club.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Leagues / Tournaments */}
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Leagues & Tournaments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {publicLeagues.length > 0 ? (
                  <div className="space-y-3">
                    {publicLeagues.map((league) => (
                      <div
                        key={league.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{league.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">{league.type}</Badge>
                              {league.start_date && (
                                <span>{new Date(league.start_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No public leagues or tournaments yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact & Links */}
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-base">Contact & Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {club.contact_email && (
                  <a
                    href={`mailto:${club.contact_email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    {club.contact_email}
                  </a>
                )}
                {club.website && (
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    {club.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {Object.entries(socialLinks).map(([platform, url]) => (
                  url && (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors capitalize"
                    >
                      <Globe className="h-4 w-4" />
                      {platform}
                    </a>
                  )
                ))}
                {!club.contact_email && !club.website && Object.keys(socialLinks).length === 0 && (
                  <p className="text-sm text-muted-foreground">No contact information available.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card className="border-white/[0.06] bg-white/[0.02]">
              <CardHeader>
                <CardTitle className="text-base">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility</span>
                  <Badge variant="secondary">Public</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Members</span>
                  <span className="text-foreground">{memberCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leagues</span>
                  <span className="text-foreground">{publicLeagues.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
