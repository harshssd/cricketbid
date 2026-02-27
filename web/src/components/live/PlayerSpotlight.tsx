'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import type { PlayerDetails } from '@/hooks/useLiveAuction'

interface PlayerSpotlightProps {
  player: PlayerDetails
  showTier?: boolean
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'BATSMAN': return '\u{1F3CF}'
    case 'BOWLER': return '\u{1F3AF}'
    case 'ALL_ROUNDER': return '\u26A1'
    case 'WICKETKEEPER': return '\u{1F9E4}'
    default: return '\u{1F3CF}'
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'BATSMAN': return 'Batsman'
    case 'BOWLER': return 'Bowler'
    case 'ALL_ROUNDER': return 'All Rounder'
    case 'WICKETKEEPER': return 'Wicketkeeper'
    default: return role
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function PlayerSpotlight({ player, showTier = true }: PlayerSpotlightProps) {
  return (
    <motion.div
      initial={{ x: 80, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: -80, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col items-center text-center"
    >
      {/* Avatar */}
      {player.image ? (
        <img
          src={player.image}
          alt={player.name}
          className="w-20 h-20 lg:w-32 lg:h-32 rounded-full object-cover border-2 border-border"
        />
      ) : (
        <div className="w-20 h-20 lg:w-32 lg:h-32 rounded-full flex items-center justify-center text-2xl lg:text-4xl font-bold text-muted-foreground bg-muted border-2 border-border">
          {getInitials(player.name)}
        </div>
      )}

      {/* Name */}
      <h2 className="text-3xl lg:text-4xl font-bold text-foreground mt-4 lg:mt-6 leading-tight">
        {player.name}
      </h2>

      {/* Role + Tier badges */}
      <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
        <Badge variant="outline">
          {getRoleIcon(player.playingRole)} {getRoleLabel(player.playingRole)}
        </Badge>

        {showTier && player.tier && (
          <>
            <Badge
              variant="outline"
              style={{
                borderColor: player.tier.color,
                color: player.tier.color,
              }}
            >
              {player.tier.name}
            </Badge>
            <Badge variant="secondary" className="tabular-nums">Base: {player.tier.basePrice}</Badge>
          </>
        )}
      </div>

      {/* Batting/bowling styles */}
      {(player.battingStyle || player.bowlingStyle) && (
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {player.battingStyle && <span>Bat: {player.battingStyle}</span>}
          {player.bowlingStyle && <span>Bowl: {player.bowlingStyle}</span>}
        </div>
      )}
    </motion.div>
  )
}
