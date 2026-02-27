'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, Users } from 'lucide-react'

interface ClubCardProps {
  id: string
  name: string
  slug: string
  description?: string | null
  location?: string | null
  logo?: string | null
  memberCount: number
  visibility: 'PUBLIC' | 'PRIVATE'
  primaryColor?: string
}

export function ClubCard({
  name,
  slug,
  description,
  location,
  logo,
  memberCount,
  primaryColor = '#3B82F6',
}: ClubCardProps) {
  return (
    <Link href={`/explore/club/${slug}`}>
      <Card className="group cursor-pointer border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 hover:border-white/[0.12]">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 rounded-lg shrink-0">
              <AvatarImage src={logo || undefined} alt={name} />
              <AvatarFallback
                className="rounded-lg text-white font-bold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate">
                {name}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">
              Public
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
