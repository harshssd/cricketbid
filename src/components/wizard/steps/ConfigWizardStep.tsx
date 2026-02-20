'use client'

import { useState } from 'react'
import { WizardStep } from '@/components/wizard/WizardStep'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { WizardInputsFormData } from '@/lib/validations/auction'
import { AuctionConfig, TierConfig } from '@/lib/types'
import { DEFAULT_TIERS } from '@/lib/config-presets'
import { Sparkles, Users, Trophy, Clock } from 'lucide-react'

interface ConfigWizardStepProps {
  data?: WizardInputsFormData
  onChange: (data: WizardInputsFormData) => void
  onRecommendationApply: (recommendation: {
    config: AuctionConfig
    tiers: TierConfig[]
    explanation: string
  }) => void
  errors?: Record<string, string[]>
}

export function ConfigWizardStep({ data = {} as any, onChange, onRecommendationApply, errors = {} }: ConfigWizardStepProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  const questions = [
    {
      id: 'playerCount',
      title: 'Player Pool Size',
      description: 'How many players will be in your auction pool?',
      icon: Users,
      type: 'number' as const,
      placeholder: 'e.g., 50',
      min: 8,
      max: 200,
      help: 'Total players available for bidding, excluding team captains'
    },
    {
      id: 'teamCount',
      title: 'Number of Teams',
      description: 'How many teams will participate in the auction?',
      icon: Trophy,
      type: 'number' as const,
      placeholder: 'e.g., 8',
      min: 2,
      max: 12,
      help: 'Each team will need a captain to participate in bidding'
    },
    {
      id: 'skillSpread',
      title: 'Skill Distribution',
      description: 'How would you describe the skill level spread in your player pool?',
      icon: Users,
      type: 'radio' as const,
      options: [
        {
          value: 'MOSTLY_EVEN',
          label: 'Mostly Even',
          description: 'Players are fairly similar in skill level'
        },
        {
          value: 'SOME_STARS',
          label: 'Some Stars',
          description: 'A few standout players, most others are similar'
        },
        {
          value: 'WIDE_RANGE',
          label: 'Wide Range',
          description: 'Clear skill tiers from beginners to experts'
        }
      ]
    },
    {
      id: 'competitiveness',
      title: 'Competition Level',
      description: 'How competitive is your league?',
      icon: Trophy,
      type: 'radio' as const,
      options: [
        {
          value: 'CASUAL',
          label: 'Casual Fun',
          description: 'Friendly games, everyone just wants to play'
        },
        {
          value: 'MODERATE',
          label: 'Moderately Competitive',
          description: 'Mix of fun and competition, some strategy involved'
        },
        {
          value: 'HIGHLY_COMPETITIVE',
          label: 'Highly Competitive',
          description: 'Serious competition, detailed strategy and analysis'
        }
      ]
    },
    {
      id: 'duration',
      title: 'Auction Duration',
      description: 'How long do you want the auction to take?',
      icon: Clock,
      type: 'radio' as const,
      options: [
        {
          value: 'UNDER_1HR',
          label: 'Quick (Under 1 hour)',
          description: 'Fast-paced, efficient auction process'
        },
        {
          value: 'ONE_TO_TWO_HRS',
          label: 'Standard (1-2 hours)',
          description: 'Balanced pace with time for strategy'
        },
        {
          value: 'NO_RUSH',
          label: 'Relaxed (No time pressure)',
          description: 'Take time for discussion and decision-making'
        }
      ]
    }
  ]

  const currentQ = questions[currentQuestion]
  const IconComponent = currentQ.icon

  const handleInputChange = (field: keyof WizardInputsFormData, value: any) => {
    onChange({
      ...data,
      [field]: field === 'playerCount' || field === 'teamCount' ? parseInt(value) || undefined : value
    })
  }

  const canProceed = () => {
    const current = currentQ.id as keyof WizardInputsFormData
    return data[current] !== undefined && (data[current] as any) !== ''
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      generateRecommendation()
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const generateRecommendation = () => {
    setIsGenerating(true)
    const { playerCount = 50, teamCount = 8, skillSpread = 'SOME_STARS', competitiveness = 'MODERATE', duration = 'ONE_TO_TWO_HRS' } = data

    // Generate budget recommendation
    let budgetPerTeam = 1000
    if (competitiveness === 'HIGHLY_COMPETITIVE') {
      budgetPerTeam = Math.max(1000, Math.floor(playerCount * 25))
    } else if (competitiveness === 'MODERATE') {
      budgetPerTeam = Math.max(800, Math.floor(playerCount * 20))
    } else {
      budgetPerTeam = Math.max(500, Math.floor(playerCount * 15))
    }

    // Generate squad size recommendation
    const squadSize = Math.min(18, Math.max(8, Math.floor(playerCount / teamCount) + 2))

    // Generate tier recommendations based on skill spread
    let tiers: TierConfig[]
    if (skillSpread === 'WIDE_RANGE') {
      tiers = [
        { name: 'Premier', basePrice: Math.floor(budgetPerTeam * 0.4), color: '#FFD700', minPerTeam: 1, maxPerTeam: 2 },
        { name: 'Star', basePrice: Math.floor(budgetPerTeam * 0.25), color: '#C0C0C0', minPerTeam: 2, maxPerTeam: 3 },
        { name: 'Core', basePrice: Math.floor(budgetPerTeam * 0.15), color: '#CD7F32', minPerTeam: 3, maxPerTeam: 5 },
        { name: 'Support', basePrice: Math.floor(budgetPerTeam * 0.08), color: '#4A90E2', minPerTeam: 2, maxPerTeam: 4 }
      ]
    } else if (skillSpread === 'SOME_STARS') {
      tiers = [
        { name: 'Star Players', basePrice: Math.floor(budgetPerTeam * 0.35), color: '#FFD700', minPerTeam: 2, maxPerTeam: 3 },
        { name: 'Regular Players', basePrice: Math.floor(budgetPerTeam * 0.12), color: '#4A90E2', minPerTeam: 4, maxPerTeam: 6 },
        { name: 'Bench Players', basePrice: Math.floor(budgetPerTeam * 0.06), color: '#95A5A6', minPerTeam: 2, maxPerTeam: 4 }
      ]
    } else {
      tiers = [
        { name: 'Core Players', basePrice: Math.floor(budgetPerTeam * 0.18), color: '#4A90E2', minPerTeam: 6, maxPerTeam: 8 },
        { name: 'Utility Players', basePrice: Math.floor(budgetPerTeam * 0.10), color: '#95A5A6', minPerTeam: 3, maxPerTeam: 5 }
      ]
    }

    const config: AuctionConfig = {
      budgetPerTeam,
      currencyName: 'Coins',
      currencyIcon: '🪙',
      squadSize,
      numTeams: teamCount
    }

    let explanation = `Based on your ${competitiveness.toLowerCase().replace('_', ' ')} league with ${playerCount} players and ${teamCount} teams, `

    if (skillSpread === 'WIDE_RANGE') {
      explanation += `we've created 4 tiers to reflect the wide skill range. `
    } else if (skillSpread === 'SOME_STARS') {
      explanation += `we've created 3 tiers with higher prices for star players. `
    } else {
      explanation += `we've created 2 balanced tiers since skills are mostly even. `
    }

    explanation += `Each team gets ${budgetPerTeam} coins and needs to build a squad of ${squadSize} players. `
    explanation += `The minimum requirements ensure balanced teams while leaving room for strategic bidding.`

    // Simulate brief processing time for better UX
    setTimeout(() => {
      onRecommendationApply({ config, tiers, explanation })
      setIsGenerating(false)
    }, 800)
  }

  const isComplete = questions.every(q => {
    const field = q.id as keyof WizardInputsFormData
    return data[field] !== undefined && (data[field] as any) !== ''
  })

  return (
    <WizardStep
      title="Configuration Wizard"
      description="Answer a few questions to get personalized recommendations"
      errors={errors}
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% complete</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Current Question */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <IconComponent className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-xl">{currentQ.title}</CardTitle>
            <CardDescription className="text-base">{currentQ.description}</CardDescription>
            {currentQ.help && (
              <p className="text-sm text-gray-500 mt-2">{currentQ.help}</p>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {currentQ.type === 'number' && (
              <div className="space-y-2">
                <Label htmlFor={currentQ.id}>Number of {currentQ.title.toLowerCase()}</Label>
                <Input
                  id={currentQ.id}
                  type="number"
                  min={currentQ.min}
                  max={currentQ.max}
                  placeholder={currentQ.placeholder}
                  value={data[currentQ.id as keyof WizardInputsFormData] || ''}
                  onChange={(e) => handleInputChange(currentQ.id as keyof WizardInputsFormData, e.target.value)}
                  className="text-center text-lg"
                />
                {currentQ.min && currentQ.max && (
                  <p className="text-xs text-gray-500 text-center">
                    Between {currentQ.min} and {currentQ.max}
                  </p>
                )}
              </div>
            )}

            {currentQ.type === 'radio' && currentQ.options && (
              <RadioGroup
                value={data[currentQ.id as keyof WizardInputsFormData] as string}
                onValueChange={(value) => handleInputChange(currentQ.id as keyof WizardInputsFormData, value)}
                className="space-y-3"
              >
                {currentQ.options.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevQuestion}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          <Button
            onClick={nextQuestion}
            disabled={!canProceed() || isGenerating}
            className="flex items-center space-x-2"
          >
            {currentQuestion === questions.length - 1 ? (
              <>
                <Sparkles className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Generating...' : 'Get Recommendations'}</span>
              </>
            ) : (
              <span>Next Question</span>
            )}
          </Button>
        </div>
      </div>
    </WizardStep>
  )
}