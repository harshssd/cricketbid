'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Minus, Plus, ChevronDown, ChevronUp, Check,
  AlertCircle, SkipForward, Undo2, RefreshCw, Loader2,
  Users, Wallet, Trophy
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useBidderSession } from '@/hooks/useBidderSession'
import type { BidderSquadPlayer } from '@/hooks/useBidderSession'

const TEAM_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

// ── Helpers ──────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'BATSMAN': return '🏏'
    case 'BOWLER': return '🎯'
    case 'ALL_ROUNDER': return '⚡'
    case 'WICKETKEEPER': return '🧤'
    default: return '🏏'
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

// ── Main Component ───────────────────────────────────────────────

export default function BidderPage() {
  const { sessionId } = useParams() as { sessionId: string }
  const { session, loading, error, timeLeft, submitBid, isSubmitting, refresh } = useBidderSession(sessionId)

  const [bidAmount, setBidAmount] = useState(0)
  const [isSkipped, setIsSkipped] = useState(false)
  const [squadExpanded, setSquadExpanded] = useState(true)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [prevRoundId, setPrevRoundId] = useState<string | null>(null)

  // Derived
  const basePrice = session?.currentRound?.tier?.basePrice || 0
  const maxBid = session?.budgetSummary.maxAllowableBid || 0
  const myBid = session?.currentRound?.myBid
  const currencyIcon = session?.auction.currencyIcon || '💰'

  // Reset bid amount when round changes
  useEffect(() => {
    const roundId = session?.currentRound?.id
    if (roundId && roundId !== prevRoundId) {
      setPrevRoundId(roundId)
      if (session?.currentRound?.myBid) {
        setBidAmount(session.currentRound.myBid.amount)
      } else if (session?.currentRound?.tier?.basePrice) {
        setBidAmount(session.currentRound.tier.basePrice)
      }
      setIsSkipped(false)
      setJustSubmitted(false)
    }
  }, [session?.currentRound?.id, session?.currentRound?.myBid, session?.currentRound?.tier?.basePrice, prevRoundId])

  // Group squad by role
  const groupedSquad = useMemo(() => {
    if (!session?.squad) return {} as Record<string, BidderSquadPlayer[]>
    return session.squad.reduce((acc, player) => {
      const role = player.playingRole || 'BATSMAN'
      if (!acc[role]) acc[role] = []
      acc[role].push(player)
      return acc
    }, {} as Record<string, BidderSquadPlayer[]>)
  }, [session?.squad])

  // Bid handler
  const handleBid = async () => {
    if (!session?.currentRound || isSubmitting) return
    try {
      await submitBid(bidAmount)
      setJustSubmitted(true)
      setTimeout(() => setJustSubmitted(false), 1500)
      toast.success(`Bid of ${bidAmount} ${currencyIcon} placed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place bid')
    }
  }

  // Timer urgency
  const timerState: 'normal' | 'warning' | 'critical' =
    timeLeft > 15 ? 'normal' : timeLeft > 5 ? 'warning' : 'critical'

  // canBid: allow when timeLeft > 0 OR when there's no timer (Infinity / rt- round)
  const roundIsOpen = timeLeft > 0 || timeLeft === Infinity || (session?.currentRound?.id?.startsWith('rt-') ?? false)
  const canBid = session?.currentRound?.status === 'OPEN'
    && roundIsOpen
    && !isSkipped
    && bidAmount >= basePrice
    && bidAmount <= (session?.budgetSummary.remaining || 0)

  // ── Loading State ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Error State ──────────────────────────────────────────────
  if (error || !session) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Unable to load</h1>
          <p className="text-muted-foreground mb-4">{error || 'Session not found'}</p>
          <div className="space-y-2">
            <Button onClick={refresh} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="w-full">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { auction, team, currentRound, budgetSummary, squad } = session

  // ── Auction Not Live ─────────────────────────────────────────
  if (auction.status === 'DRAFT' || auction.status === 'LOBBY') {
    return (
      <div className="min-h-screen bg-muted">
        <div className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
                <p className="text-sm text-muted-foreground">{auction.name}</p>
              </div>
              <Badge variant="secondary">
                {auction.status === 'DRAFT' ? 'Draft' : 'Lobby'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <div className="text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-foreground mb-2">Auction hasn&apos;t started yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Waiting for the auctioneer to begin
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{budgetSummary.totalBudget.toLocaleString()} {currencyIcon} budget</span>
              <span className="w-px h-4 bg-border" />
              <span>{auction.squadSize} squad slots</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Auction Completed ────────────────────────────────────────
  if (auction.status === 'COMPLETED' || auction.status === 'ARCHIVED') {
    return (
      <div className="min-h-screen bg-muted">
        <div className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
                <p className="text-sm text-muted-foreground">{auction.name}</p>
              </div>
              <Badge variant="secondary">Complete</Badge>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Final Squad ({squad.length}/{auction.squadSize})</CardTitle>
                </CardHeader>
                <CardContent>
                  {squad.length > 0 ? (
                    <div className="space-y-2">
                      {squad.map((player) => (
                        <div key={player.id} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span>{getRoleIcon(player.playingRole)}</span>
                            <div>
                              <span className="font-medium text-sm">{player.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{getRoleLabel(player.playingRole)}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="tabular-nums">{player.acquiredPrice} {currencyIcon}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No players acquired</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Budget Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spent</span>
                      <span className="tabular-nums">{budgetSummary.spent.toLocaleString()} {currencyIcon}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Remaining</span>
                      <span className="tabular-nums">{budgetSummary.remaining.toLocaleString()} {currencyIcon}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-3">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${budgetSummary.percentRemaining}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Live Auction View ────────────────────────────────────────
  const isWaiting = !currentRound || !currentRound.player
  // Round is open if: no timer (Infinity), or runtime_state fallback (rt-), or time remaining
  const isTimedOut = currentRound && timeLeft <= 0 && timeLeft !== Infinity && !currentRound.id?.startsWith('rt-')
  const isOpenIndefinitely = timeLeft === Infinity || (currentRound?.id?.startsWith('rt-') ?? false)

  return (
    <div className="min-h-screen bg-muted">
      {/* Header — matches auctioneer */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
              <p className="text-sm text-muted-foreground">
                {auction.name} &middot; {budgetSummary.remaining.toLocaleString()} {currencyIcon} remaining
              </p>
            </div>
            <Badge variant="default">Live</Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {isWaiting ? (
            /* ── Waiting for Next Player ──────────────────── */
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                        </span>
                        BIDDING
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <motion.div
                          animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-20 h-20 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center"
                        >
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </motion.div>
                        <h2 className="text-xl font-bold text-foreground mb-1">Waiting for next player...</h2>
                        <p className="text-sm text-muted-foreground">
                          {session.auctionProgress.availablePlayers} players remaining
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Budget */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Remaining</span>
                          <span className="tabular-nums font-medium">{budgetSummary.remaining.toLocaleString()} {currencyIcon}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Squad</span>
                          <span className="tabular-nums">{squad.length}/{auction.squadSize}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Max Bid</span>
                          <span className="tabular-nums">{maxBid.toLocaleString()} {currencyIcon}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 mt-3 overflow-hidden">
                          <motion.div
                            className="bg-primary h-full rounded-full"
                            initial={false}
                            animate={{ width: `${budgetSummary.percentRemaining}%` }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {budgetSummary.spent.toLocaleString()} / {budgetSummary.totalBudget.toLocaleString()} {currencyIcon} spent
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Progress */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Sold</span>
                          <span className="tabular-nums">{session.auctionProgress.soldPlayers}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Available</span>
                          <span className="tabular-nums">{session.auctionProgress.availablePlayers}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-3">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${session.auctionProgress.totalPlayers > 0 ? (session.auctionProgress.soldPlayers / session.auctionProgress.totalPlayers) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── Active Bidding ───────────────────────────── */
            <motion.div
              key={`round-${currentRound!.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Bidding Card */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="overflow-hidden relative">
                    {/* Timed-out overlay */}
                    <AnimatePresence>
                      {isTimedOut && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl"
                        >
                          <div className="text-center">
                            <p className="text-foreground font-semibold text-lg">Bidding Closed</p>
                            {currentRound!.highestBid != null && (
                              <p className="text-muted-foreground text-sm mt-1">
                                Highest: {currentRound!.highestBid} {currencyIcon} &middot; {currentRound!.totalBids} bids
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                        </span>
                        NOW BIDDING
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentRound!.id}
                          initial={{ x: 80, opacity: 0, scale: 0.95 }}
                          animate={{ x: 0, opacity: 1, scale: 1 }}
                          exit={{ x: -80, opacity: 0, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="text-center"
                        >
                          {/* Player Info */}
                          <div className="mb-6">
                            {currentRound!.player?.image ? (
                              <img
                                src={currentRound!.player.image}
                                alt={currentRound!.player.name}
                                className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-border"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-muted-foreground">
                                {getInitials(currentRound!.player?.name || '?')}
                              </div>
                            )}

                            <h2 className="text-3xl font-bold text-foreground">
                              {currentRound!.player?.name}
                            </h2>
                            <div className="flex items-center justify-center gap-3 mt-2">
                              {currentRound!.tier && (
                                <>
                                  <Badge style={{ borderColor: currentRound!.tier.color, color: currentRound!.tier.color }} variant="outline">
                                    {currentRound!.tier.name}
                                  </Badge>
                                  <Badge variant="secondary" className="tabular-nums">Base: {currentRound!.tier.basePrice}</Badge>
                                </>
                              )}
                              <Badge variant="outline">
                                {getRoleIcon(currentRound!.player?.playingRole || '')} {getRoleLabel(currentRound!.player?.playingRole || '')}
                              </Badge>
                            </div>
                            {(currentRound!.player?.battingStyle || currentRound!.player?.bowlingStyle) && (
                              <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                                {currentRound!.player?.battingStyle && <span>Bat: {currentRound!.player.battingStyle}</span>}
                                {currentRound!.player?.bowlingStyle && <span>Bowl: {currentRound!.player.bowlingStyle}</span>}
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="mb-6">
                            {isOpenIndefinitely ? (
                              <div className="text-lg font-medium text-success">
                                Open for bidding
                              </div>
                            ) : (
                              <motion.div
                                animate={
                                  timerState === 'critical'
                                    ? { x: [-1.5, 1.5, -1.5, 1.5, 0], scale: [1, 1.04, 1] }
                                    : timerState === 'warning'
                                      ? { scale: [1, 1.02, 1], opacity: [1, 0.85, 1] }
                                      : {}
                                }
                                transition={
                                  timerState === 'critical'
                                    ? { duration: 0.4, repeat: Infinity }
                                    : timerState === 'warning'
                                      ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                                      : {}
                                }
                              >
                                <div
                                  className={cn(
                                    'font-mono text-5xl font-bold tabular-nums tracking-wider',
                                    timerState === 'critical' && 'text-destructive',
                                    timerState === 'warning' && 'text-warning',
                                    timerState === 'normal' && 'text-foreground',
                                  )}
                                  role="timer"
                                >
                                  {formatTime(timeLeft)}
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {/* Bid Status Badge */}
                          <AnimatePresence mode="wait">
                            {myBid && (
                              <motion.div
                                key="bid-status"
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="flex justify-center mb-4"
                              >
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-sm py-1 px-3',
                                    myBid.status === 'WINNING'
                                      ? 'border-success text-success'
                                      : 'border-info text-info'
                                  )}
                                >
                                  <Check className="w-3.5 h-3.5 mr-1.5" />
                                  Your Bid: {myBid.amount} {currencyIcon}
                                  <span className="mx-1 opacity-40">&middot;</span>
                                  {myBid.status === 'WINNING' ? 'WINNING' : 'SUBMITTED'}
                                </Badge>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Bid Controls */}
                          <div className="max-w-sm mx-auto">
                            {isSkipped ? (
                              <div className="space-y-3 py-2">
                                <p className="text-muted-foreground text-sm">Skipping this player</p>
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => setIsSkipped(false)}
                                >
                                  <Undo2 className="w-4 h-4 mr-2" />
                                  Change Mind
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Amount row */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 shrink-0"
                                    disabled={bidAmount - 10 < basePrice || isTimedOut as boolean }
                                    onClick={() => setBidAmount(prev => Math.max(basePrice, prev - 10))}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>

                                  <div className="flex-1 h-12 rounded-md border bg-card flex items-center justify-center text-xl font-bold text-foreground tabular-nums">
                                    {bidAmount}
                                  </div>

                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-12 w-12 shrink-0"
                                    disabled={bidAmount + 10 > maxBid || isTimedOut as boolean }
                                    onClick={() => setBidAmount(prev => Math.min(maxBid, prev + 10))}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>

                                {/* Quick-amount pills */}
                                <div className="flex items-center gap-2">
                                  {[
                                    { label: 'Base', value: basePrice },
                                    { label: '+50', value: Math.min(bidAmount + 50, maxBid) },
                                    { label: 'Max', value: maxBid },
                                  ].map((pill) => (
                                    <Button
                                      key={pill.label}
                                      variant={bidAmount === pill.value ? 'default' : 'outline'}
                                      size="sm"
                                      className="flex-1"
                                      disabled={isTimedOut as boolean }
                                      onClick={() => setBidAmount(pill.value)}
                                    >
                                      {pill.label}
                                    </Button>
                                  ))}
                                </div>

                                {/* Place Bid button */}
                                <Button
                                  className="w-full h-14 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
                                  disabled={!canBid || isSubmitting }
                                  onClick={handleBid}
                                >
                                  {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : myBid ? (
                                    bidAmount === myBid.amount ? (
                                      <><Check className="w-5 h-5 mr-2" />Bid Placed</>
                                    ) : (
                                      'Update Bid'
                                    )
                                  ) : (
                                    'Place Bid'
                                  )}
                                </Button>

                                {/* Skip button */}
                                {!myBid && (
                                  <Button
                                    variant="ghost"
                                    className="w-full text-muted-foreground"
                                    size="sm"
                                    disabled={isTimedOut as boolean }
                                    onClick={() => setIsSkipped(true)}
                                  >
                                    <SkipForward className="w-3.5 h-3.5 mr-1.5" />
                                    Skip
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Budget */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Remaining</span>
                          <span className="tabular-nums font-medium">{budgetSummary.remaining.toLocaleString()} {currencyIcon}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Squad</span>
                          <span className="tabular-nums">{squad.length}/{auction.squadSize}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Max Bid</span>
                          <span className="tabular-nums">{maxBid.toLocaleString()} {currencyIcon}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 mt-3 overflow-hidden">
                          <motion.div
                            className="bg-primary h-full rounded-full"
                            initial={false}
                            animate={{ width: `${budgetSummary.percentRemaining}%` }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {budgetSummary.spent.toLocaleString()} / {budgetSummary.totalBudget.toLocaleString()} {currencyIcon} spent
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* My Squad */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>My Squad ({squad.length}/{auction.squadSize})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setSquadExpanded(prev => !prev)}
                        >
                          {squadExpanded
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />
                          }
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <AnimatePresence>
                      {squadExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <CardContent>
                            {squad.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No players acquired yet</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER'] as const).map((role) => {
                                  const players = groupedSquad[role]
                                  if (!players?.length) return null
                                  return (
                                    <div key={role}>
                                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                                        {getRoleIcon(role)} {getRoleLabel(role)}
                                      </p>
                                      <div className="space-y-1">
                                        {players.map((p) => (
                                          <div
                                            key={p.id}
                                            className="flex justify-between items-center p-2 bg-muted rounded"
                                          >
                                            <span className="text-sm font-medium truncate">{p.name}</span>
                                            <Badge variant="secondary" className="tabular-nums text-xs shrink-0 ml-2">
                                              {p.acquiredPrice}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>

                  {/* Progress */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Sold</span>
                          <span className="tabular-nums">{session.auctionProgress.soldPlayers}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Available</span>
                          <span className="tabular-nums">{session.auctionProgress.availablePlayers}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-3">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${session.auctionProgress.totalPlayers > 0 ? (session.auctionProgress.soldPlayers / session.auctionProgress.totalPlayers) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── All Team Squads ─────────────────────────────── */}
        {session.allTeamSquads && session.allTeamSquads.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              All Squads
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {session.allTeamSquads.map((entry, idx) => {
                const color = TEAM_COLORS[idx % TEAM_COLORS.length]
                return (
                  <Card
                    key={entry.id}
                    className={cn(
                      'overflow-hidden',
                      entry.isCurrentTeam && 'ring-2'
                    )}
                    style={entry.isCurrentTeam ? { '--tw-ring-color': color, borderColor: color } as React.CSSProperties : undefined}
                  >
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-sm truncate">{entry.name}</span>
                        </div>
                        {entry.isCurrentTeam && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0" style={{ borderColor: color, color }}>
                            You
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0">
                      <div className="space-y-1.5">
                        {/* Captain */}
                        {entry.captainPlayer && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span
                              className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              C
                            </span>
                            <span className="font-medium truncate">{entry.captainPlayer.name}</span>
                            <span className="text-muted-foreground shrink-0">{getRoleIcon(entry.captainPlayer.playingRole)}</span>
                          </div>
                        )}

                        {/* Acquired players */}
                        {entry.players.length > 0 ? (
                          entry.players.map(p => (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0">{getRoleIcon(p.playingRole)}</span>
                                <span className="truncate">{p.name}</span>
                              </div>
                              <span className="text-muted-foreground tabular-nums shrink-0 ml-1">
                                {p.acquiredPrice} {currencyIcon}
                              </span>
                            </div>
                          ))
                        ) : (
                          !entry.captainPlayer && (
                            <p className="text-xs text-muted-foreground">No players yet</p>
                          )
                        )}
                        {entry.players.length === 0 && entry.captainPlayer && (
                          <p className="text-[11px] text-muted-foreground">No players yet</p>
                        )}
                      </div>

                      {/* Budget bar */}
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{entry.playerCount} player{entry.playerCount !== 1 ? 's' : ''}</span>
                          <span className="tabular-nums">{entry.budgetRemaining.toLocaleString()} {currencyIcon}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              backgroundColor: color,
                              width: `${budgetSummary.totalBudget > 0 ? (entry.budgetRemaining / budgetSummary.totalBudget) * 100 : 100}%`,
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
        )}
      </div>
    </div>
  )
}
