'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiveAuction } from '@/hooks/useLiveAuction'
import { useViewConfig } from '@/lib/view-config-manager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, ChevronDown, Users } from 'lucide-react'
import { LiveHeader } from './LiveHeader'
import { PlayerSpotlight } from './PlayerSpotlight'
import { TeamCard } from './TeamCard'
import { TeamsOverview } from './TeamsOverview'
import { SoldCelebration } from './SoldCelebration'
import { WaitingState } from './WaitingState'
import { AuctionComplete } from './AuctionComplete'
import type { LiveTeam } from '@/hooks/useLiveAuction'

function getRoleIcon(role?: string) {
  switch (role) {
    case 'BATSMAN': return '\u{1F3CF}'
    case 'BOWLER': return '\u{1F3AF}'
    case 'ALL_ROUNDER': return '\u26A1'
    case 'WICKETKEEPER': return '\u{1F9E4}'
    default: return '\u{1F3CF}'
  }
}

function AllSquadsSection({ teams }: { teams: LiveTeam[] }) {
  if (teams.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-muted-foreground" />
        All Squads
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {teams.map((team) => {
          const totalPlayers = team.players.length + (team.captain ? 1 : 0)
          return (
            <Card key={team.name} className="overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="font-semibold text-sm truncate">{team.name}</span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 pt-0">
                <div className="space-y-1.5">
                  {/* Captain */}
                  {team.captain && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: team.color }}
                      >
                        C
                      </span>
                      <span className="font-medium truncate">{team.captain.name}</span>
                      {team.captain.role && (
                        <span className="text-muted-foreground shrink-0">{getRoleIcon(team.captain.role)}</span>
                      )}
                    </div>
                  )}

                  {/* Acquired players */}
                  {team.players.length > 0 ? (
                    team.players.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                          <span className="shrink-0">{getRoleIcon(p.role)}</span>
                          <span className="truncate">{p.name}</span>
                      </div>
                    ))
                  ) : (
                    !team.captain && (
                      <p className="text-xs text-muted-foreground">No players yet</p>
                    )
                  )}
                  {team.players.length === 0 && team.captain && (
                    <p className="text-[11px] text-muted-foreground">No players yet</p>
                  )}
                </div>

                {/* Budget bar */}
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{totalPlayers} player{totalPlayers !== 1 ? 's' : ''}</span>
                    <span className="tabular-nums">{team.coins.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        backgroundColor: team.color,
                        width: `${team.originalCoins > 0 ? (team.coins / team.originalCoins) * 100 : 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

interface LiveAuctionViewProps {
  auctionId: string
}

export default function LiveAuctionView({ auctionId }: LiveAuctionViewProps) {
  const {
    viewState,
    auctionName,
    currentPlayer,
    teams,
    lastSoldEvent,
    progress,
    isConnected,
  } = useLiveAuction(auctionId)
  const { config } = useViewConfig(auctionId, 'public')
  const [budgetsExpanded, setBudgetsExpanded] = useState(true)
  const [showSquads, setShowSquads] = useState(false)

  return (
    <div className="min-h-screen bg-muted">
      <LiveHeader
        auctionName={auctionName}
        progress={progress}
        isConnected={isConnected}
        showSquads={showSquads}
        onToggleSquads={() => setShowSquads(prev => !prev)}
      />

      {/* Auction Progress Widget */}
      {progress.total > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Card className="overflow-hidden">
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Auction Progress
                </span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span><span className="font-semibold text-foreground tabular-nums">{progress.sold}</span> sold</span>
                  <span><span className="font-semibold text-foreground tabular-nums">{Math.max(0, progress.total - progress.sold - progress.unsold)}</span> remaining</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                  initial={false}
                  animate={{ width: `${progress.total > 0 ? (progress.sold / progress.total) * 100 : 0}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div className="text-center">
                  <div className="text-lg font-bold tabular-nums text-emerald-500">{progress.sold}</div>
                  <div className="text-[11px] text-muted-foreground">Sold</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold tabular-nums text-amber-500">{Math.max(0, progress.total - progress.sold - progress.unsold)}</div>
                  <div className="text-[11px] text-muted-foreground">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold tabular-nums text-red-500">{progress.unsold}</div>
                  <div className="text-[11px] text-muted-foreground">Unsold</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Squads overlay — shown on toggle, above the normal view */}
        <AnimatePresence>
          {showSquads && teams.length > 0 && (
            <motion.div
              key="squads-overlay"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {teams.map((team) => (
                  <TeamCard key={team.name} team={team} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {(viewState === 'connecting' || viewState === 'waiting') && (
            <WaitingState key="waiting" state={viewState} />
          )}

          {viewState === 'player_up' && currentPlayer && (
            <motion.div
              key="player-up"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main: Now Auctioning card */}
                <div className="lg:col-span-2">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                        </span>
                        NOW AUCTIONING
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center py-6 lg:py-10">
                        <AnimatePresence mode="wait">
                          <PlayerSpotlight key={currentPlayer.name} player={currentPlayer} showTier={config.showPlayerTier} />
                        </AnimatePresence>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar: Team Budgets (collapsible) */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Team Budgets</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setBudgetsExpanded(prev => !prev)}
                        >
                          {budgetsExpanded
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />
                          }
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <AnimatePresence initial={false}>
                      {budgetsExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <CardContent>
                            <div className="space-y-4">
                              {teams.map((team) => {
                                const pct = team.originalCoins > 0 ? (team.coins / team.originalCoins) * 100 : 0
                                const totalPlayers = team.players.length + (team.captain ? 1 : 0)
                                return (
                                  <div key={team.name}>
                                    <div className="flex justify-between items-center mb-1">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{ backgroundColor: team.color }}
                                        />
                                        <span className="font-medium text-sm">{team.name}</span>
                                      </div>
                                      <span className="text-sm tabular-nums text-muted-foreground">
                                        {team.coins} / {team.originalCoins}
                                      </span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                      <motion.div
                                        className="bg-primary h-full rounded-full"
                                        initial={false}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                                      />
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {totalPlayers} players
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </div>
              </div>

              {/* All Squads section below the main grid */}
              <AllSquadsSection teams={teams} />
            </motion.div>
          )}

          {viewState === 'between_bids' && (
            <motion.div
              key="between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TeamsOverview teams={teams} />
            </motion.div>
          )}

          {viewState === 'auction_complete' && (
            <AuctionComplete key="complete" teams={teams} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {viewState === 'sold_celebration' && lastSoldEvent && (
          <SoldCelebration event={lastSoldEvent} showSoldAmount={config.showSalesDetails} />
        )}
      </AnimatePresence>
    </div>
  )
}
