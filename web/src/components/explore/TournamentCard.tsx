'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, MapPin, Calendar, Users } from 'lucide-react'

interface TournamentCardProps {
  id: string
  name: string
  description?: string | null
  type: string
  venue?: string | null
  startDate?: string | null
  endDate?: string | null
  registrationStatus?: string | null
  registrationCount: number
  format?: string | null
}

const registrationStatusColors: Record<string, string> = {
  OPEN: 'bg-green-500/10 text-green-400',
  CLOSED: 'bg-red-500/10 text-red-400',
  UPCOMING: 'bg-yellow-500/10 text-yellow-400',
}

export function TournamentCard({
  id,
  name,
  description,
  type,
  venue,
  startDate,
  registrationStatus,
  registrationCount,
  format,
}: TournamentCardProps) {
  const regStatus = registrationStatus || 'UPCOMING'

  return (
    <Link href={`/tournament/${id}`}>
      <Card className="group cursor-pointer border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 hover:border-white/[0.12]">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Trophy className="h-6 w-6 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">{type}</Badge>
                <Badge className={`text-xs ${registrationStatusColors[regStatus]}`}>
                  {regStatus === 'OPEN' ? 'Open' : regStatus === 'CLOSED' ? 'Closed' : 'Upcoming'}
                </Badge>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate">
                {name}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                {venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {venue}
                  </span>
                )}
                {startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {format && (
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    {format}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {registrationCount} teams
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
