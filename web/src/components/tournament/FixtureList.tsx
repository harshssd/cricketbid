'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin } from 'lucide-react'

interface FixtureData {
  id: string
  match_number: number
  team_a_name: string
  team_b_name: string
  venue?: string | null
  scheduled_at?: string | null
  result?: string | null
  winner?: string | null
  notes?: string | null
}

interface FixtureListProps {
  fixtures: FixtureData[]
}

export function FixtureList({ fixtures }: FixtureListProps) {
  if (fixtures.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No fixtures scheduled yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {fixtures.map((fixture) => {
        const isCompleted = !!fixture.result
        return (
          <Card key={fixture.id} className="border-white/[0.06] bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-xs text-muted-foreground font-mono w-8">
                    #{fixture.match_number}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${fixture.winner === fixture.team_a_name ? 'text-green-400' : 'text-foreground'}`}>
                        {fixture.team_a_name}
                      </span>
                      <span className="text-muted-foreground text-sm">vs</span>
                      <span className={`font-medium ${fixture.winner === fixture.team_b_name ? 'text-green-400' : 'text-foreground'}`}>
                        {fixture.team_b_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {fixture.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(fixture.scheduled_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      {fixture.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {fixture.venue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  {isCompleted ? (
                    <Badge className="bg-green-500/10 text-green-400 text-xs">
                      {fixture.result}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Upcoming
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
