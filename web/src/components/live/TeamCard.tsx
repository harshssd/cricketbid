'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import type { LiveTeam } from '@/hooks/useLiveAuction'

interface TeamCardProps {
  team: LiveTeam
  compact?: boolean
}

function getRoleIcon(role?: string) {
  switch (role) {
    case 'BATSMAN': return '\u{1F3CF}'
    case 'BOWLER': return '\u{1F3AF}'
    case 'ALL_ROUNDER': return '\u26A1'
    case 'WICKETKEEPER': return '\u{1F9E4}'
    default: return ''
  }
}

function getRoleLabel(role?: string) {
  switch (role) {
    case 'BATSMAN': return 'BAT'
    case 'BOWLER': return 'BOWL'
    case 'ALL_ROUNDER': return 'AR'
    case 'WICKETKEEPER': return 'WK'
    default: return ''
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function TeamCard({ team, compact }: TeamCardProps) {
  const budgetPct = team.originalCoins > 0 ? (team.coins / team.originalCoins) * 100 : 0
  const totalPlayers = team.players.length + (team.captain ? 1 : 0)

  if (compact) {
    return (
      <div className="bg-card rounded-xl border p-3 lg:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: team.color }}
          />
          <span className="text-sm font-medium text-foreground truncate">{team.name}</span>
          <span className="text-xs text-muted-foreground ml-auto tabular-nums shrink-0">
            {totalPlayers}
          </span>
        </div>

        {/* Captain */}
        {team.captain && (
          <div className="flex items-center gap-1.5 mb-2 text-xs">
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">C</Badge>
            <span className="text-muted-foreground truncate">{team.captain.name}</span>
          </div>
        )}

        {/* Player list (desktop only) */}
        {team.players.length > 0 && (
          <div className="hidden lg:block mb-2 space-y-0.5">
            {team.players.slice(0, 2).map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-[10px]">{getRoleIcon(p.role)}</span>
                <span className="truncate">{p.name}</span>
              </div>
            ))}
            {team.players.length > 2 && (
              <span className="text-xs text-muted-foreground">+{team.players.length - 2} more</span>
            )}
          </div>
        )}

        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${budgetPct}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
      </div>
    )
  }

  // Expanded mode — show all players
  return (
    <div className="bg-card rounded-xl border p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-xs font-bold text-foreground/80 shrink-0 bg-muted border"
        >
          {getInitials(team.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm lg:text-base font-medium text-foreground truncate">{team.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {team.coins} / {team.originalCoins}
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {totalPlayers} players
        </span>
      </div>

      {/* Budget bar */}
      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${budgetPct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>

      {/* Squad Composition */}
      {totalPlayers > 0 && (() => {
        const roles = [
          { key: 'BATSMAN', label: 'Batsmen', icon: '\u{1F3CF}', color: '#a855f7' },
          { key: 'BOWLER', label: 'Bowlers', icon: '\u{1F3AF}', color: '#a855f7' },
          { key: 'ALL_ROUNDER', label: 'All-Rounders', icon: '\u26A1', color: '#a855f7' },
          { key: 'WICKETKEEPER', label: 'Keepers', icon: '\u{1F9E4}', color: '#a855f7' },
        ]
        const allRoles = [
          ...(team.captain?.role ? [team.captain.role] : []),
          ...team.players.map(p => p.role),
        ]
        const maxCount = Math.max(1, ...roles.map(r => allRoles.filter(pr => pr === r.key).length))
        return (
          <div className="mb-3 pb-3 border-b border-border/50">
            <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
              Squad Composition
            </p>
            <div className="flex items-center gap-4">
              {/* Donut ring */}
              <div className="shrink-0">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" className="text-muted" strokeWidth="5" />
                  <circle
                    cx="28" cy="28" r="22"
                    fill="none" stroke={team.color} strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - Math.min(1, totalPlayers / Math.max(totalPlayers, 11)))}`}
                    transform="rotate(-90 28 28)"
                  />
                  <text x="28" y="26" textAnchor="middle" className="fill-foreground text-sm font-bold">{totalPlayers}</text>
                  <text x="28" y="37" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '8px' }}>players</text>
                </svg>
              </div>
              {/* Role bars */}
              <div className="flex-1 space-y-1.5">
                {roles.map(r => {
                  const count = allRoles.filter(pr => pr === r.key).length
                  return (
                    <div key={r.key} className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] w-4 shrink-0">{r.icon}</span>
                      <span className="text-muted-foreground w-20 truncate">{r.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: r.color }}
                          initial={false}
                          animate={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        />
                      </div>
                      <span className="tabular-nums text-foreground font-medium w-4 text-right shrink-0">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Player list */}
      {(team.captain || team.players.length > 0) && (
        <div className="space-y-1.5">
          {team.captain && (
            <div className="flex items-center gap-1.5 text-xs">
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">C</Badge>
              <span className="text-muted-foreground truncate">{team.captain.name}</span>
              {team.captain.role && (
                <span className="text-muted-foreground/50 text-[10px] shrink-0">{getRoleLabel(team.captain.role)}</span>
              )}
            </div>
          )}
          {team.players.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-[11px]">{getRoleIcon(p.role)}</span>
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
