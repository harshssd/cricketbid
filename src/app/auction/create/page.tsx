'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { PageTransition } from '@/components/PageTransition'

// Question components
import { PlayerPoolSizeQuestion } from '@/components/auction-setup/PlayerPoolSizeQuestion'
import { TeamCountQuestion } from '@/components/auction-setup/TeamCountQuestion'
import { TeamBudgetQuestion } from '@/components/auction-setup/TeamBudgetQuestion'
import { AuctionNameQuestion } from '@/components/auction-setup/AuctionNameQuestion'
import { FinalSetupQuestion } from '@/components/auction-setup/FinalSetupQuestion'
import { PresetSelectionStep } from '@/components/auction-setup/PresetSelectionStep'

interface AuctionSetup {
  playerPoolSize: number
  teamCount: number
  teamBudget: number
  auctionName: string
  teams: Array<{ name: string; coins: number }>
}

const QUESTIONS = [
  {
    id: 0,
    title: 'Choose Your Setup',
    subtitle: 'Pick a preset to get started quickly, or configure everything yourself',
    description: ''
  },
  {
    id: 1,
    title: 'Player Pool Size',
    subtitle: 'How many players will be in your auction pool?',
    description: 'Include all players who might be bid on during the auction'
  },
  {
    id: 2,
    title: 'Number of Teams',
    subtitle: 'How many teams will participate in the auction?',
    description: 'Each team will need a captain to place bids'
  },
  {
    id: 3,
    title: 'Team Budget',
    subtitle: 'How much money should each team start with?',
    description: 'This is the total budget each team has to spend on players'
  },
  {
    id: 4,
    title: 'Auction Name',
    subtitle: 'Give your auction a name',
    description: 'This will help identify your auction for participants'
  },
  {
    id: 5,
    title: 'Final Setup',
    subtitle: 'Review your settings and start the auction',
    description: 'Once created, you can add teams and players'
  }
]

export default function CreateAuctionPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <CreateAuctionContent />
    </Suspense>
  )
}

function CreateAuctionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const leagueId = searchParams.get('league')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [setup, setSetup] = useState<AuctionSetup>({
    playerPoolSize: 50,
    teamCount: 4,
    teamBudget: 600,
    auctionName: '',
    teams: []
  })

  const currentQuestionData = QUESTIONS[currentQuestion]
  // Preset step (0) doesn't count toward progress; steps 1-5 do
  const progress = currentQuestion === 0 ? 0 : (currentQuestion / (QUESTIONS.length - 1)) * 100

  useEffect(() => {
    if (setup.teamCount > 0) {
      const newTeams = Array.from({ length: setup.teamCount }, (_, i) => ({
        name: `Team ${i + 1}`,
        coins: setup.teamBudget
      }))
      setSetup(prev => ({ ...prev, teams: newTeams }))
    }
  }, [setup.teamCount, setup.teamBudget])

  const handlePresetSelect = (preset: 'quick' | 'full' | 'custom') => {
    if (preset === 'quick') {
      setSetup(prev => ({ ...prev, teamCount: 4, playerPoolSize: 50, teamBudget: 600 }))
      setDirection(1)
      setCurrentQuestion(4) // skip to name step
    } else if (preset === 'full') {
      setSetup(prev => ({ ...prev, teamCount: 8, playerPoolSize: 100, teamBudget: 1200 }))
      setDirection(1)
      setCurrentQuestion(4) // skip to name step
    } else {
      setDirection(1)
      setCurrentQuestion(1)
    }
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setDirection(1)
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setDirection(-1)
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const canProceed = () => {
    switch (currentQuestion) {
      case 0:
        return true
      case 1:
        return setup.playerPoolSize >= 8 && setup.playerPoolSize <= 200
      case 2:
        return setup.teamCount >= 2 && setup.teamCount <= 12
      case 3:
        return setup.teamBudget >= 100 && setup.teamBudget <= 10000
      case 4:
        return setup.auctionName.trim().length >= 3
      case 5:
        return true
      default:
        return false
    }
  }

  const handleCreateAuction = async () => {
    try {
      if (!leagueId) {
        alert('No league selected. Please create an auction from a league dashboard.')
        return
      }

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
          currencyIcon: '🪙',
          squadSize: 11,
          numTeams: setup.teamCount
        },
        teams: setup.teams.map(team => ({
          name: team.name,
          primaryColor: '#3B82F6',
          secondaryColor: '#1B2A4A',
        })),
        tiers: [
          { name: 'Tier 0', basePrice: 120, color: '#EF4444', sortOrder: 0, minPerTeam: 0, maxPerTeam: 5 },
          { name: 'Tier 1', basePrice: 90, color: '#F97316', sortOrder: 1, minPerTeam: 0, maxPerTeam: 6 },
          { name: 'Tier 2', basePrice: 60, color: '#3B82F6', sortOrder: 2, minPerTeam: 0, maxPerTeam: 25 },
          { name: 'Tier 3', basePrice: 30, color: '#10B981', sortOrder: 3, minPerTeam: 0, maxPerTeam: 14 }
        ],
        primaryColor: '#1B2A4A',
        secondaryColor: '#3B82F6'
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
        soldPlayers: {},
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
    }
  }

  const renderQuestion = () => {
    switch (currentQuestion) {
      case 0:
        return <PresetSelectionStep onSelectPreset={handlePresetSelect} />
      case 1:
        return (
          <PlayerPoolSizeQuestion
            value={setup.playerPoolSize}
            onChange={(value) => setSetup(prev => ({ ...prev, playerPoolSize: value }))}
          />
        )
      case 2:
        return (
          <TeamCountQuestion
            value={setup.teamCount}
            onChange={(value) => setSetup(prev => ({ ...prev, teamCount: value }))}
          />
        )
      case 3:
        return (
          <TeamBudgetQuestion
            value={setup.teamBudget}
            onChange={(value) => setSetup(prev => ({ ...prev, teamBudget: value }))}
          />
        )
      case 4:
        return (
          <AuctionNameQuestion
            value={setup.auctionName}
            onChange={(value) => setSetup(prev => ({ ...prev, auctionName: value }))}
          />
        )
      case 5:
        return (
          <FinalSetupQuestion
            setup={setup}
            onCreateAuction={handleCreateAuction}
          />
        )
      default:
        return null
    }
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -50 : 50, opacity: 0 }),
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background text-foreground">
        {/* Progress Bar */}
        <Progress value={progress} className="rounded-none" />

        {/* Header */}
        <div className="flex justify-between items-center p-6">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <span>{currentQuestion === 0 ? 'Getting started' : `Question ${currentQuestion} of ${QUESTIONS.length - 1}`}</span>
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <span className="tabular-nums">{Math.round(progress)}% complete</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="border border-border rounded-3xl p-12 bg-card">
            {/* Question Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            {/* Question Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">{currentQuestionData.title}</h1>
              <p className="text-xl text-muted-foreground mb-2">{currentQuestionData.subtitle}</p>
              {currentQuestionData.description && (
                <p className="text-muted-foreground">{currentQuestionData.description}</p>
              )}
            </div>

            {/* Question Content with animated transitions */}
            <div className="mb-12">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentQuestion}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  {renderQuestion()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation */}
          {currentQuestion > 0 && (
            <div className="flex justify-between items-center py-8">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>

              {currentQuestion === QUESTIONS.length - 1 ? (
                <Button
                  onClick={handleCreateAuction}
                  disabled={!canProceed()}
                  className="px-8"
                >
                  Create Auction
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  variant="secondary"
                  className="px-8"
                >
                  Next Question
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
