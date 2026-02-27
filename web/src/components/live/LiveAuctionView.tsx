'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiveAuction } from '@/hooks/useLiveAuction'
import { useViewConfig } from '@/lib/view-config-manager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { LiveHeader } from './LiveHeader'
import { PlayerSpotlight } from './PlayerSpotlight'
import { TeamCard } from './TeamCard'
import { TeamsOverview } from './TeamsOverview'
import { SoldCelebration } from './SoldCelebration'
import { WaitingState } from './WaitingState'
import { AuctionComplete } from './AuctionComplete'
import type { LiveTeam, LiveOutcryState } from '@/hooks/useLiveAuction'

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
    biddingType,
    outcryState,
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

                  {/* Open Outcry Live Bid Display */}
                  {biddingType === 'OPEN_OUTCRY' && (
                    <Card className="mt-4 overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            Live Bidding
                          </span>
                          {outcryState.timerSecondsLeft !== null && (
                            <span className={`text-sm font-mono tabular-nums ${
                              outcryState.timerSecondsLeft <= 5 ? 'text-red-400 animate-pulse' :
                              outcryState.timerSecondsLeft <= 10 ? 'text-amber-400' :
                              'text-muted-foreground'
                            }`}>
                              {outcryState.timerSecondsLeft}s
                            </span>
                          )}
                        </div>

                        {/* Current Bid */}
                        <div className="text-center py-3">
                          <div className="text-3xl font-bold tabular-nums">
                            {outcryState.currentBid > 0 ? outcryState.currentBid : '--'}
                          </div>
                          {outcryState.currentBidTeamName ? (
                            <div className="text-sm font-medium text-emerald-500 mt-1">
                              {outcryState.currentBidTeamName} leads
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground mt-1">
                              Waiting for bids...
                            </div>
                          )}
                        </div>

                        {/* Recent Bids */}
                        {outcryState.recentBids.length > 0 && (
                          <div className="mt-3 border-t pt-3 space-y-1.5 max-h-[200px] overflow-y-auto">
                            {outcryState.recentBids.slice(0, 10).map((bid, i) => (
                              <div
                                key={`${bid.sequence}-${bid.teamName}`}
                                className={`flex items-center justify-between px-3 py-1.5 rounded text-sm ${
                                  i === 0 ? 'bg-primary/10 font-medium' : 'text-muted-foreground'
                                }`}
                              >
                                <span className="truncate">{bid.teamName}</span>
                                <span className="font-bold tabular-nums ml-2">{bid.amount}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
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
