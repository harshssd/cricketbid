'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Trophy, Users, Clock, Eye, Coins, Calendar,
  Globe, Lock, Zap, Play, UserCheck
} from 'lucide-react'
import { AuctionListItem } from '@/hooks/useAuctions'

interface AuctionCardProps {
  auction: AuctionListItem
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'bg-red-500 text-white'
      case 'LOBBY': return 'bg-yellow-500 text-white'
      case 'COMPLETED': return 'bg-green-500 text-white'
      case 'DRAFT': return 'bg-gray-500 text-white'
      case 'ARCHIVED': return 'bg-slate-400 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'LIVE': return <Zap className="h-3 w-3" />
      case 'LOBBY': return <UserCheck className="h-3 w-3" />
      case 'COMPLETED': return <Trophy className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const getActionButton = () => {
    switch (auction.status) {
      case 'LIVE':
        return (
          <Button asChild className="w-full bg-red-500 hover:bg-red-600">
            <Link href={`/auction/${auction.id}/live`}>
              <Play className="h-4 w-4 mr-2" />
              Join Live
            </Link>
          </Button>
        )
      case 'LOBBY':
        return (
          <Button asChild className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
            <Link href={`/auction/${auction.id}/lobby`}>
              <UserCheck className="h-4 w-4 mr-2" />
              Enter Lobby
            </Link>
          </Button>
        )
      case 'COMPLETED':
        return (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/auction/${auction.id}/results`}>
              <Trophy className="h-4 w-4 mr-2" />
              View Results
            </Link>
          </Button>
        )
      default:
        return (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/auction/${auction.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              {auction.status === 'DRAFT' ? 'Edit Auction' : 'View Details'}
            </Link>
          </Button>
        )
    }
  }

  const cardStyle = auction.banner
    ? {
        backgroundImage: `linear-gradient(135deg, ${auction.primaryColor}ee, ${auction.secondaryColor}ee), url(${auction.banner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: `linear-gradient(135deg, ${auction.primaryColor}, ${auction.secondaryColor})`
      }

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Header with background */}
      <div
        className="h-32 relative text-white p-4 flex flex-col justify-between"
        style={cardStyle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {auction.logo && (
              <Avatar className="h-8 w-8 ring-2 ring-white/20">
                <AvatarImage src={auction.logo} alt={auction.name} />
                <AvatarFallback>{auction.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <Badge className={`${getStatusColor(auction.status)} text-xs`}>
                {getStatusIcon(auction.status)}
                {auction.status}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {auction.visibility === 'PRIVATE' ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg leading-tight mb-1">
            {auction.name}
          </h3>
          {auction.tagline && (
            <p className="text-white/90 text-sm">{auction.tagline}</p>
          )}
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="space-y-2">
          {/* Organization info */}
          {auction.league && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Trophy className="h-3 w-3 mr-1" />
              {auction.league.name}
            </div>
          )}

          {/* Schedule */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            {format(auction.scheduledAt, 'MMM d, yyyy • h:mm a')} ({auction.timezone})
          </div>

          {/* Owner */}
          <div className="text-xs text-muted-foreground">
            Organized by {auction.owner.name}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center text-lg font-bold">
              <Users className="h-4 w-4 mr-1" />
              {auction.teamCount}
            </div>
            <div className="text-xs text-muted-foreground">Teams</div>
          </div>
          <div>
            <div className="flex items-center justify-center text-lg font-bold">
              <UserCheck className="h-4 w-4 mr-1" />
              {auction.playerCount}
            </div>
            <div className="text-xs text-muted-foreground">Players</div>
          </div>
          <div>
            <div className="flex items-center justify-center text-lg font-bold">
              <Coins className="h-4 w-4 mr-1" />
              {auction.budgetPerTeam}
            </div>
            <div className="text-xs text-muted-foreground">Budget</div>
          </div>
        </div>

        {/* Progress bar for completed auctions */}
        {auction.status === 'COMPLETED' && auction.playerCount > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Players Sold</span>
              <span>{auction.playersSold}/{auction.playerCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(auction.playersSold / auction.playerCount) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Action button */}
        {getActionButton()}
      </CardContent>
    </Card>
  )
}