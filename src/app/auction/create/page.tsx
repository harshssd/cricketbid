'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

// Question components
import { PlayerPoolSizeQuestion } from '@/components/auction-setup/PlayerPoolSizeQuestion'
import { TeamCountQuestion } from '@/components/auction-setup/TeamCountQuestion'
import { TeamBudgetQuestion } from '@/components/auction-setup/TeamBudgetQuestion'
import { AuctionNameQuestion } from '@/components/auction-setup/AuctionNameQuestion'
import { FinalSetupQuestion } from '@/components/auction-setup/FinalSetupQuestion'

interface AuctionSetup {
  playerPoolSize: number
  teamCount: number
  teamBudget: number
  auctionName: string
  teams: Array<{ name: string; coins: number }>
}

const QUESTIONS = [
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
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [setup, setSetup] = useState<AuctionSetup>({
    playerPoolSize: 50,
    teamCount: 4,
    teamBudget: 600,
    auctionName: '',
    teams: []
  })

  const currentQuestionData = QUESTIONS[currentQuestion - 1]
  const progress = (currentQuestion / QUESTIONS.length) * 100

  useEffect(() => {
    // Initialize teams when team count changes
    if (setup.teamCount > 0) {
      const newTeams = Array.from({ length: setup.teamCount }, (_, i) => ({
        name: `Team ${i + 1}`,
        coins: setup.teamBudget
      }))
      setSetup(prev => ({ ...prev, teams: newTeams }))
    }
  }, [setup.teamCount, setup.teamBudget])

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const canProceed = () => {
    switch (currentQuestion) {
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
      // Create auction payload for the API
      const auctionPayload = {
        basicInfo: {
          name: setup.auctionName,
          description: `Cricket auction with ${setup.teamCount} teams and ${setup.playerPoolSize} players`,
          visibility: 'PRIVATE' as const,
          scheduledAt: new Date(),
          timezone: 'UTC'
        },
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
          logo: undefined
        })),
        tiers: [
          { name: 'Tier 0', basePrice: 120, color: '#EF4444', sortOrder: 0, minPerTeam: 0, maxPerTeam: 5 },
          { name: 'Tier 1', basePrice: 90, color: '#F97316', sortOrder: 1, minPerTeam: 0, maxPerTeam: 6 },
          { name: 'Tier 2', basePrice: 60, color: '#3B82F6', sortOrder: 2, minPerTeam: 0, maxPerTeam: 25 },
          { name: 'Tier 3', basePrice: 30, color: '#10B981', sortOrder: 3, minPerTeam: 0, maxPerTeam: 14 }
        ],
        branding: {
          primaryColor: '#1B2A4A',
          secondaryColor: '#3B82F6',
          font: 'system'
        }
      }

      // Call the database API
      const response = await fetch('/api/auction/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auctionPayload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create auction')
      }

      const auctionId = result.id

      // Create auction data structure for real-time system
      const auctionData = {
        id: auctionId,
        name: setup.auctionName,
        teams: setup.teams.map(team => ({
          ...team,
          coins: setup.teamBudget,
          originalCoins: setup.teamBudget,
          players: []
        })),
        auctionQueue: [], // Will be populated with player names when players are added
        auctionIndex: 0,
        auctionStarted: false,
        soldPlayers: {},
        unsoldPlayers: [],
        deferredPlayers: [],
        auctionHistory: [],
        lastUpdated: new Date().toISOString()
      }

      // Save to localStorage for real-time system compatibility
      localStorage.setItem(`cricket-auction-${auctionId}`, JSON.stringify(auctionData))

      // Set as active auction
      localStorage.setItem('cricket-auction-active', auctionId)

      // Navigate to the created auction
      router.push(`/auction/${auctionId}`)
    } catch (error) {
      console.error('Failed to create auction:', error)
      alert(`Failed to create auction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const renderQuestion = () => {
    switch (currentQuestion) {
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Progress Bar */}
      <div className="w-full bg-gray-800 h-2">
        <div
          className="bg-blue-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <div className="flex items-center space-x-2 text-gray-400">
          <span>Question {currentQuestion} of {QUESTIONS.length}</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="border border-gray-700 rounded-3xl p-12 bg-gray-900">
          {/* Question Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          {/* Question Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{currentQuestionData.title}</h1>
            <p className="text-xl text-gray-300 mb-2">{currentQuestionData.subtitle}</p>
            <p className="text-gray-400">{currentQuestionData.description}</p>
          </div>

          {/* Question Content */}
          <div className="mb-12">
            {renderQuestion()}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center py-8">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentQuestion === 1}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
          >
            Previous
          </Button>

          {currentQuestion === QUESTIONS.length ? (
            <Button
              onClick={handleCreateAuction}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              Create Auction
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-gray-600 hover:bg-gray-500 text-white px-8"
            >
              Next Question
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}