'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Trophy, Clock, Coins, Users, Target, AlertCircle,
  Check, X, Send, Timer, Crown, Zap, TrendingUp,
  Minus, Plus, DollarSign
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Player {
  id: string
  name: string
  image?: string
  playingRole: string
  tier: {
    name: string
    basePrice: number
    color: string
  }
  stats?: {
    matches?: number
    runs?: number
    wickets?: number
    average?: number
  }
}

interface Team {
  id: string
  name: string
  primaryColor: string
  remainingBudget: number
  totalBudget: number
  playerCount: number
  captain?: {
    name: string
    image?: string
  }
}

interface CurrentRound {
  id: string
  playerId: string
  tierId: string
  status: 'OPEN' | 'CLOSED' | 'PENDING'
  timeRemaining: number
  maxTime: number
  player: Player
  tier: {
    name: string
    basePrice: number
    color: string
  }
  myBid?: {
    amount: number
    submittedAt: Date
    status: 'SUBMITTED' | 'WINNING' | 'OUTBID'
  }
  highestBid?: number
  totalBids: number
}

interface CaptainSession {
  id: string
  auction: {
    id: string
    name: string
    status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'COMPLETED'
    currencyName: string
    currencyIcon: string
  }
  team: Team
  currentRound?: CurrentRound
  roundHistory: any[]
  isConnected: boolean
}

export default function CaptainBiddingPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<CaptainSession | null>(null)
  const [bidAmount, setBidAmount] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Auto-refresh timer
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load session data
  const loadSession = async () => {
    try {
      const response = await fetch(`/api/captain/${sessionId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          toast.error('Please log in to access the captain interface')
          router.push('/login')
          return
        } else if (response.status === 403) {
          toast.error('Access denied - you are not authorized to bid for this team')
          router.push('/dashboard')
          return
        } else if (response.status === 404) {
          toast.error('Auction or team not found')
          router.push('/dashboard')
          return
        } else {
          throw new Error(errorData.error || 'Failed to load session')
        }
      }

      const data = await response.json()
      setSession(data)

      // Set initial bid amount to base price if there's a current round
      if (data.currentRound && !bidAmount) {
        setBidAmount(data.currentRound.tier.basePrice.toString())
      }

      // Set timer if round is active
      if (data.currentRound?.status === 'OPEN') {
        setTimeLeft(data.currentRound.timeRemaining)
      }
    } catch (error) {
      console.error('Failed to load captain session:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load auction session')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Submit bid
  const handleSubmitBid = async () => {
    if (!session?.currentRound || !bidAmount) return

    const amount = parseInt(bidAmount)
    if (isNaN(amount) || amount < session.currentRound.tier.basePrice) {
      toast.error(`Minimum bid is ${session.currentRound.tier.basePrice} ${session.auction.currencyName}`)
      return
    }

    if (amount > session.team.remainingBudget) {
      toast.error('Insufficient budget')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/captain/${sessionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roundId: session.currentRound.id,
          playerId: session.currentRound.playerId,
          amount: amount,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 403) {
          toast.error('Access denied - you are not authorized to bid for this team')
          router.push('/dashboard')
          return
        } else if (response.status === 401) {
          toast.error('Please log in to submit bids')
          router.push('/login')
          return
        } else {
          throw new Error(errorData.error || 'Failed to submit bid')
        }
      }

      const result = await response.json()
      toast.success(`Bid submitted: ${amount} ${session.auction.currencyName}`)

      // Refresh session data
      await loadSession()
    } catch (error) {
      console.error('Failed to submit bid:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit bid')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Quick bid helpers
  const adjustBid = (increment: number) => {
    if (!session?.currentRound) return
    const current = parseInt(bidAmount) || session.currentRound.tier.basePrice
    const newAmount = Math.max(current + increment, session.currentRound.tier.basePrice)
    setBidAmount(newAmount.toString())
  }

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && session?.currentRound?.status === 'OPEN') {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => Math.max(0, prev - 1))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, session?.currentRound?.status])

  // Auto-refresh session data
  useEffect(() => {
    loadSession()

    // Refresh every 3 seconds when auction is live
    if (session?.auction.status === 'LIVE') {
      intervalRef.current = setInterval(loadSession, 3000)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sessionId])

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'text-green-600 bg-green-100'
      case 'LOBBY': return 'text-yellow-600 bg-yellow-100'
      case 'COMPLETED': return 'text-gray-600 bg-gray-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-white">Loading auction session...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
          <p className="mb-4">This captain session may have expired or been removed.</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const { auction, team, currentRound } = session

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Auction Info */}
            <div className="flex items-center space-x-4">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <h1 className="text-xl font-bold text-white">{auction.name}</h1>
                <Badge className={cn('text-xs', getStatusColor(auction.status))}>
                  {auction.status}
                </Badge>
              </div>
            </div>

            {/* Team Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-white font-semibold">{team.name}</p>
                <p className="text-gray-300 text-sm">
                  {team.remainingBudget} {auction.currencyIcon} remaining
                </p>
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: team.primaryColor }}
              >
                {team.name.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Connection Status */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  session.isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-white text-sm">
                  {session.isConnected ? 'Connected to auction' : 'Disconnected'}
                </span>
              </div>
              {currentRound && (
                <div className="flex items-center space-x-2 text-white text-sm">
                  <Timer className="h-4 w-4" />
                  <span>Round: {currentRound.status}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Round */}
        {currentRound ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Player Card */}
            <div className="lg:col-span-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Target className="h-5 w-5 text-blue-400" />
                      <span>Current Player</span>
                    </CardTitle>
                    {currentRound.status === 'OPEN' && timeLeft > 0 && (
                      <div className="flex items-center space-x-2 text-orange-400">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono font-bold">
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                    )}
                  </div>
                  {currentRound.status === 'OPEN' && (
                    <Progress
                      value={(timeLeft / currentRound.maxTime) * 100}
                      className="h-2 bg-slate-700"
                    />
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Player Info */}
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={currentRound.player.image} />
                      <AvatarFallback className="text-lg font-bold bg-blue-600">
                        {currentRound.player.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {currentRound.player.name}
                      </h2>
                      <div className="flex items-center space-x-3 mb-3">
                        <Badge
                          variant="outline"
                          className="border-blue-500 text-blue-400"
                        >
                          {currentRound.player.playingRole.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: currentRound.tier.color,
                            color: currentRound.tier.color
                          }}
                        >
                          {currentRound.tier.name}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-gray-300 text-sm">
                        <span className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Base: {currentRound.tier.basePrice} {auction.currencyIcon}</span>
                        </span>
                        {currentRound.highestBid && (
                          <span className="flex items-center space-x-1 text-yellow-400">
                            <TrendingUp className="h-4 w-4" />
                            <span>Highest: {currentRound.highestBid} {auction.currencyIcon}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Player Stats */}
                  {currentRound.player.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-700/50 rounded-lg">
                      {currentRound.player.stats.matches && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-white">{currentRound.player.stats.matches}</p>
                          <p className="text-xs text-gray-400">Matches</p>
                        </div>
                      )}
                      {currentRound.player.stats.runs && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-white">{currentRound.player.stats.runs}</p>
                          <p className="text-xs text-gray-400">Runs</p>
                        </div>
                      )}
                      {currentRound.player.stats.wickets && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-white">{currentRound.player.stats.wickets}</p>
                          <p className="text-xs text-gray-400">Wickets</p>
                        </div>
                      )}
                      {currentRound.player.stats.average && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-white">{currentRound.player.stats.average}</p>
                          <p className="text-xs text-gray-400">Average</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* My Bid Status */}
                  {currentRound.myBid && (
                    <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Check className="h-5 w-5 text-green-400" />
                          <span className="text-white font-semibold">
                            Your bid: {currentRound.myBid.amount} {auction.currencyIcon}
                          </span>
                        </div>
                        <Badge
                          variant={currentRound.myBid.status === 'WINNING' ? 'default' : 'secondary'}
                          className={currentRound.myBid.status === 'WINNING' ? 'bg-green-600' : ''}
                        >
                          {currentRound.myBid.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bidding Panel */}
            <div>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <span>Place Bid</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Enter your bid for {currentRound.player.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Budget Display */}
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Available Budget</span>
                      <span className="text-white font-semibold">
                        {team.remainingBudget} {auction.currencyIcon}
                      </span>
                    </div>
                    <Progress
                      value={(team.remainingBudget / team.totalBudget) * 100}
                      className="h-2 mt-2 bg-slate-600"
                    />
                  </div>

                  {/* Bid Amount Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Bid Amount
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustBid(-10)}
                        disabled={currentRound.status !== 'OPEN' || isSubmitting}
                        className="p-2 text-white border-slate-600 hover:bg-slate-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={currentRound.tier.basePrice}
                        max={team.remainingBudget}
                        placeholder={currentRound.tier.basePrice.toString()}
                        disabled={currentRound.status !== 'OPEN' || isSubmitting}
                        className="text-center text-lg font-bold bg-slate-700 border-slate-600 text-white"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustBid(10)}
                        disabled={currentRound.status !== 'OPEN' || isSubmitting}
                        className="p-2 text-white border-slate-600 hover:bg-slate-700"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick Bid Options */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Quick Options
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBidAmount(currentRound.tier.basePrice.toString())}
                        disabled={currentRound.status !== 'OPEN' || isSubmitting}
                        className="text-xs text-white border-slate-600 hover:bg-slate-700"
                      >
                        Base Price
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBidAmount((currentRound.tier.basePrice + 50).toString())}
                        disabled={currentRound.status !== 'OPEN' || isSubmitting}
                        className="text-xs text-white border-slate-600 hover:bg-slate-700"
                      >
                        +50 {auction.currencyIcon}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBidAmount((currentRound.tier.basePrice + 100).toString())}
                        disabled={currentRound.status !== 'OPEN' || isSubmitting}
                        className="text-xs text-white border-slate-600 hover:bg-slate-700"
                      >
                        +100 {auction.currencyIcon}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBidAmount(Math.min(team.remainingBudget, currentRound.tier.basePrice * 2).toString())}
                        disabled={currentRound.status !== 'OPEN' || isSubmitting}
                        className="text-xs text-white border-slate-600 hover:bg-slate-700"
                      >
                        Max Safe
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-slate-600" />

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitBid}
                    disabled={
                      currentRound.status !== 'OPEN' ||
                      isSubmitting ||
                      !bidAmount ||
                      parseInt(bidAmount) < currentRound.tier.basePrice ||
                      parseInt(bidAmount) > team.remainingBudget ||
                      timeLeft === 0
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Bid
                      </>
                    )}
                  </Button>

                  {/* Bid Info */}
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>• Minimum bid: {currentRound.tier.basePrice} {auction.currencyIcon}</p>
                    <p>• Total bids submitted: {currentRound.totalBids}</p>
                    {currentRound.myBid && (
                      <p>• You have already submitted a bid</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* No Active Round */
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                No Active Round
              </h2>
              <p className="text-gray-400 mb-4">
                {auction.status === 'LOBBY'
                  ? 'Auction hasn\'t started yet. Please wait for the moderator to begin.'
                  : auction.status === 'COMPLETED'
                  ? 'Auction has ended. Thank you for participating!'
                  : 'Waiting for the next player to be announced.'
                }
              </p>
              {auction.status === 'LIVE' && (
                <div className="flex items-center justify-center space-x-2 text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
                  <span>Waiting for next round...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Team Summary */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-400" />
              <span>Team Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <p className="text-2xl font-bold text-white">{team.playerCount}</p>
                <p className="text-xs text-gray-400">Players</p>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <p className="text-2xl font-bold text-white">{team.remainingBudget}</p>
                <p className="text-xs text-gray-400">Budget Left</p>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <p className="text-2xl font-bold text-white">{team.totalBudget - team.remainingBudget}</p>
                <p className="text-xs text-gray-400">Spent</p>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <p className="text-2xl font-bold text-white">
                  {Math.round((team.remainingBudget / team.totalBudget) * 100)}%
                </p>
                <p className="text-xs text-gray-400">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}