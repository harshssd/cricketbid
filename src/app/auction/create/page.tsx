'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Users, Target, Coins, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '@/components/PageTransition'

interface AuctionSetup {
  playerPoolSize: number
  teamCount: number
  teamBudget: number
  auctionName: string
  teams: Array<{ name: string; coins: number }>
}

const POOL_PRESETS = [20, 50, 100, 150, 200]
const BUDGET_PRESETS = [300, 600, 1000, 2000, 5000]
const TEAM_MIN = 2
const TEAM_MAX = 12

export default function CreateAuctionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <CreateAuctionContent />
    </Suspense>
  )
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="tabular-nums"
      >
        {value.toLocaleString()}
      </motion.span>
    </AnimatePresence>
  )
}

function CreateAuctionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const leagueId = searchParams.get('league')
  const [isCreating, setIsCreating] = useState(false)
  const [setup, setSetup] = useState<AuctionSetup>({
    playerPoolSize: 50,
    teamCount: 4,
    teamBudget: 600,
    auctionName: '',
    teams: []
  })

  useEffect(() => {
    if (setup.teamCount > 0) {
      const newTeams = Array.from({ length: setup.teamCount }, (_, i) => ({
        name: `Team ${i + 1}`,
        coins: setup.teamBudget
      }))
      setSetup(prev => ({ ...prev, teams: newTeams }))
    }
  }, [setup.teamCount, setup.teamBudget])

  const canCreate = setup.auctionName.trim().length >= 3

  const handleCreateAuction = async () => {
    try {
      if (!leagueId) {
        alert('No league selected. Please create an auction from a league dashboard.')
        return
      }

      setIsCreating(true)

      const auctionPayload = {
        basicInfo: {
          name: setup.auctionName,
          description: `Cricket auction with ${setup.teamCount} teams and ${setup.playerPoolSize} players`,
          visibility: 'PRIVATE' as const,
        },
        leagueId,
        config: {
          budgetPerTeam: setup.teamBudget,
          currencyName: 'Coins',
          currencyIcon: '\u{1FA99}',
          squadSize: 11,
          numTeams: setup.teamCount
        },
        teams: setup.teams.map(team => ({
          name: team.name,
        })),
        tiers: [
          { name: 'Tier 0', basePrice: 120, color: '#EF4444', sortOrder: 0, minPerTeam: 0, maxPerTeam: 5 },
          { name: 'Tier 1', basePrice: 90, color: '#F97316', sortOrder: 1, minPerTeam: 0, maxPerTeam: 6 },
          { name: 'Tier 2', basePrice: 60, color: '#3B82F6', sortOrder: 2, minPerTeam: 0, maxPerTeam: 25 },
          { name: 'Tier 3', basePrice: 30, color: '#10B981', sortOrder: 3, minPerTeam: 0, maxPerTeam: 14 }
        ],
      }

      const response = await fetch('/api/auction/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auctionPayload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create auction')
      }

      const auctionId = result.id

      const auctionData = {
        id: auctionId,
        name: setup.auctionName,
        teams: setup.teams.map(team => ({
          ...team,
          coins: setup.teamBudget,
          originalCoins: setup.teamBudget,
          players: []
        })),
        auctionQueue: [],
        auctionIndex: 0,
        auctionStarted: false,
        soldPlayers: [],
        unsoldPlayers: [],
        deferredPlayers: [],
        auctionHistory: [],
        lastUpdated: new Date().toISOString()
      }

      localStorage.setItem(`cricket-auction-${auctionId}`, JSON.stringify(auctionData))
      localStorage.setItem('cricket-auction-active', auctionId)
      router.push(`/auction/${auctionId}`)
    } catch (error) {
      console.error('Failed to create auction:', error)
      alert(`Failed to create auction: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsCreating(false)
    }
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
    })
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-3xl mx-auto px-6 py-12 pb-32">

          {/* Page Header */}
          <motion.div
            custom={0}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="mb-12"
          >
            <h1
              className="text-5xl tracking-tight mb-2"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Create Auction
            </h1>
            <p className="text-muted-foreground text-lg">
              Configure your cricket auction in one go.
            </p>
          </motion.div>

          {/* Auction Name */}
          <motion.div
            custom={1}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="mb-8"
          >
            <div className="bg-card/50 border border-border/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Auction Name
                </label>
              </div>
              <Input
                type="text"
                value={setup.auctionName}
                onChange={(e) => setSetup(prev => ({ ...prev, auctionName: e.target.value }))}
                onClick={(e) => e.currentTarget.select()}
                placeholder="e.g. Summer Cricket Championship"
                maxLength={50}
                className="w-full h-14 text-2xl bg-transparent border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/30"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  {setup.auctionName.length < 3 && setup.auctionName.length > 0 && (
                    <span className="text-orange-400">At least 3 characters</span>
                  )}
                </span>
                <span className="tabular-nums">{setup.auctionName.length}/50</span>
              </div>
            </div>
          </motion.div>

          {/* 3-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Player Pool */}
            <motion.div
              custom={2}
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="bg-card/50 border border-border/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Player Pool
                </label>
              </div>
              <div className="text-4xl font-bold mb-5">
                <AnimatedNumber value={setup.playerPoolSize} />
              </div>
              <Slider
                value={[setup.playerPoolSize]}
                onValueChange={([v]) => setSetup(prev => ({ ...prev, playerPoolSize: v }))}
                min={8}
                max={200}
                step={1}
                className="mb-4"
              />
              <div className="flex flex-wrap gap-1.5">
                {POOL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSetup(prev => ({ ...prev, playerPoolSize: preset }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors tabular-nums ${
                      setup.playerPoolSize === preset
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Teams */}
            <motion.div
              custom={3}
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="bg-card/50 border border-border/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Teams
                </label>
              </div>
              <div className="text-4xl font-bold mb-5">
                <AnimatedNumber value={setup.teamCount} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: TEAM_MAX - TEAM_MIN + 1 }, (_, i) => i + TEAM_MIN).map((n) => (
                  <motion.button
                    key={n}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSetup(prev => ({ ...prev, teamCount: n }))}
                    className={`w-9 h-9 rounded-full text-sm font-bold transition-colors ${
                      n <= setup.teamCount
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Budget */}
            <motion.div
              custom={4}
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="bg-card/50 border border-border/50 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Budget
                </label>
              </div>
              <div className="text-4xl font-bold mb-5">
                <AnimatedNumber value={setup.teamBudget} />
              </div>
              <Slider
                value={[setup.teamBudget]}
                onValueChange={([v]) => setSetup(prev => ({ ...prev, teamBudget: v }))}
                min={100}
                max={10000}
                step={50}
                className="mb-4"
              />
              <div className="flex flex-wrap gap-1.5">
                {BUDGET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSetup(prev => ({ ...prev, teamBudget: preset }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors tabular-nums ${
                      setup.teamBudget === preset
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Floating bottom bar */}
        <motion.div
          custom={5}
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-xl"
        >
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              <span className="tabular-nums">{setup.teamCount}</span> teams
              {' \u00B7 '}
              <span className="tabular-nums">{setup.playerPoolSize}</span> players
              {' \u00B7 '}
              <span className="tabular-nums">{setup.teamBudget.toLocaleString()}</span> coins each
            </p>
            <Button
              onClick={handleCreateAuction}
              disabled={!canCreate || isCreating}
              size="lg"
              className="sm:w-auto w-full"
            >
              {isCreating ? 'Creating...' : 'Create Auction'}
            </Button>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}
