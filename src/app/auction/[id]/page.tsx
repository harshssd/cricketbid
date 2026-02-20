'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Users,
  Trophy,
  Play,
  Settings,
  Upload,
  Download,
  Trash2,
  Edit,
  Save,
  Copy,
  Check,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Search
} from 'lucide-react'
import { auctionRealtimeManager, type AuctionState, type PlayerBid } from '@/lib/auction-realtime'
import ViewConfigDialog from '@/components/view-config/ViewConfigDialog'
import { useViewConfig } from '@/lib/view-config-manager'
import { AuctionTeamManager } from '@/components/teams/AuctionTeamManager'
import { UploadUserList } from '@/components/auction/UploadUserList'
import { PlayerImport } from '@/components/auction/PlayerImport'

// Default 50 players from your specification
interface Player {
  name: string
  tier: 0 | 1 | 2 | 3
  basePrice: number
  note: string | null
  playingRole: string // Changed to string to support multiple roles like "BATSMAN,WICKETKEEPER"
}

const DEFAULT_PLAYERS: Player[] = [
  // Tier 0 (5 players) - Base price 120
  { name: 'Virat Kohli', tier: 0, basePrice: 120, note: null, playingRole: 'BATSMAN' },
  { name: 'Babar Azam', tier: 0, basePrice: 120, note: null, playingRole: 'BATSMAN' },
  { name: 'Steve Smith', tier: 0, basePrice: 120, note: null, playingRole: 'BATSMAN' },
  { name: 'Kane Williamson', tier: 0, basePrice: 120, note: null, playingRole: 'BATSMAN' },
  { name: 'Joe Root', tier: 0, basePrice: 120, note: null, playingRole: 'BATSMAN' },

  // Tier 1 (6 players) - Base price 90
  { name: 'Rohit Sharma', tier: 1, basePrice: 90, note: null, playingRole: 'BATSMAN' },
  { name: 'David Warner', tier: 1, basePrice: 90, note: null, playingRole: 'BATSMAN' },
  { name: 'AB de Villiers', tier: 1, basePrice: 90, note: 'Limited', playingRole: 'WICKETKEEPER' },
  { name: 'Chris Gayle', tier: 1, basePrice: 90, note: null, playingRole: 'BATSMAN' },
  { name: 'MS Dhoni', tier: 1, basePrice: 90, note: null, playingRole: 'WICKETKEEPER' },
  { name: 'Jos Buttler', tier: 1, basePrice: 90, note: null, playingRole: 'WICKETKEEPER' },

  // Tier 2 (25 players) - Base price 60
  { name: 'KL Rahul', tier: 2, basePrice: 60, note: null, playingRole: 'WICKETKEEPER' },
  { name: 'Quinton de Kock', tier: 2, basePrice: 60, note: null, playingRole: 'WICKETKEEPER' },
  { name: 'Shikhar Dhawan', tier: 2, basePrice: 60, note: null, playingRole: 'BATSMAN' },
  { name: 'Faf du Plessis', tier: 2, basePrice: 60, note: null, playingRole: 'BATSMAN' },
  { name: 'Rishabh Pant', tier: 2, basePrice: 60, note: null, playingRole: 'WICKETKEEPER' },
  { name: 'Glenn Maxwell', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Andre Russell', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Ben Stokes', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Pat Cummins', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Jasprit Bumrah', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Kagiso Rabada', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Trent Boult', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Rashid Khan', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Sunil Narine', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Hardik Pandya', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Kieron Pollard', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Shakib Al Hasan', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Mohammad Nabi', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Dwayne Bravo', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Chris Morris', tier: 2, basePrice: 60, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Mohammed Shami', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Yuzvendra Chahal', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Bhuvneshwar Kumar', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Mitchell Starc', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },
  { name: 'Josh Hazlewood', tier: 2, basePrice: 60, note: null, playingRole: 'BOWLER' },

  // Tier 3 (14 players) - Base price 30
  { name: 'Prithvi Shaw', tier: 3, basePrice: 30, note: null, playingRole: 'BATSMAN' },
  { name: 'Devdutt Padikkal', tier: 3, basePrice: 30, note: null, playingRole: 'BATSMAN' },
  { name: 'Ruturaj Gaikwad', tier: 3, basePrice: 30, note: null, playingRole: 'BATSMAN' },
  { name: 'Ishan Kishan', tier: 3, basePrice: 30, note: null, playingRole: 'WICKETKEEPER' },
  { name: 'Sanju Samson', tier: 3, basePrice: 30, note: null, playingRole: 'WICKETKEEPER' },
  { name: 'Washington Sundar', tier: 3, basePrice: 30, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Axar Patel', tier: 3, basePrice: 30, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'Deepak Chahar', tier: 3, basePrice: 30, note: null, playingRole: 'BOWLER' },
  { name: 'Shardul Thakur', tier: 3, basePrice: 30, note: null, playingRole: 'ALL_ROUNDER' },
  { name: 'T Natarajan', tier: 3, basePrice: 30, note: null, playingRole: 'BOWLER' },
  { name: 'Rahul Chahar', tier: 3, basePrice: 30, note: null, playingRole: 'BOWLER' },
  { name: 'Kuldeep Yadav', tier: 3, basePrice: 30, note: null, playingRole: 'BOWLER' },
  { name: 'Manish Pandey', tier: 3, basePrice: 30, note: null, playingRole: 'BATSMAN' },
  { name: 'Suryakumar Yadav', tier: 3, basePrice: 30, note: null, playingRole: 'BATSMAN' }
]

// Remove local interfaces, use the ones from auction-realtime

export default function AuctionPage() {
  const params = useParams()
  const auctionId = params.id as string

  const [auction, setAuction] = useState<AuctionState | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const validTabs = ['setup', 'players', 'auction', 'teams']
  const [activeTab, setActiveTabState] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '')
      if (validTabs.includes(hash)) return hash
    }
    return 'setup'
  })
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab)
    window.location.hash = tab
  }
  const [newPlayerName, setNewPlayerName] = useState('')
  const [currentBids, setCurrentBids] = useState<Record<string, PlayerBid>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [uploadUserListOpen, setUploadUserListOpen] = useState(false)
  const [showPlayerImport, setShowPlayerImport] = useState(false)
  const [sellPrice, setSellPrice] = useState<number>(0)
  const [sellTeam, setSellTeam] = useState<string>('')
  const [apiTiers, setApiTiers] = useState<{ id: string; name: string; basePrice: number; color: string; sortOrder?: number }[]>([])
  const [apiPlayers, setApiPlayers] = useState<any[]>([])
  const [apiPlayerStats, setApiPlayerStats] = useState<any>(null)
  const [shuffleMode, setShuffleMode] = useState<'random' | 'tier-ordered'>('random')
  const [tierOrder, setTierOrder] = useState<{ tierId: string; tierName: string; basePrice: number; position: number }[]>([])
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editPlayerForm, setEditPlayerForm] = useState({
    name: '',
    playingRole: 'BATSMAN',
    tier: 0 as 0 | 1 | 2 | 3,
    basePrice: 30,
    note: ''
  })
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['BATSMAN'])
  const [playerSearchTerm, setPlayerSearchTerm] = useState('')

  // Sync tab with browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (validTabs.includes(hash)) setActiveTabState(hash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(key)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  // Initialize tier order from API tiers
  useEffect(() => {
    if (apiTiers.length > 0 && tierOrder.length === 0) {
      const sorted = [...apiTiers].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      setTierOrder(sorted.map((t, i) => ({
        tierId: t.id,
        tierName: t.name,
        basePrice: t.basePrice,
        position: i
      })))
    }
  }, [apiTiers, tierOrder.length])

  const moveTierOrder = (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= tierOrder.length) return
    const updated = [...tierOrder]
    const temp = updated[index]
    updated[index] = { ...updated[swapIndex], position: index }
    updated[swapIndex] = { ...temp, position: swapIndex }
    setTierOrder(updated)
  }

  const fisherYatesShuffle = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // View configuration
  const { config: viewConfig } = useViewConfig(auctionId, 'auctioneer')

  // Save auction runtime state to database
  const persistAuctionState = async (state: AuctionState) => {
    try {
      await fetch(`/api/auctions/${auctionId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtimeState: state })
      })
    } catch (e) {
      console.error('Failed to persist auction state:', e)
    }
  }

  // Load auction runtime state from database
  const loadPersistedState = async (): Promise<AuctionState | null> => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/state`)
      if (!response.ok) return null
      const data = await response.json()
      return data.runtimeState as AuctionState | null
    } catch {
      return null
    }
  }

  useEffect(() => {
    // Ensure auctionId is available before making API calls
    if (!auctionId) {
      setLoading(false)
      setError('Invalid auction ID')
      return
    }

    // Try to load auction data from API first
    const loadAuctionData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/auctions/${auctionId}`)
        if (response.ok) {
          const auctionData = await response.json()

          // Check if there's a persisted live auction state
          const persistedState = await loadPersistedState()

          let finalAuction: AuctionState

          if (persistedState && persistedState.auctionStarted && auctionData.status === 'LIVE') {
            // Restore persisted auction state (queue, index, sold players, etc.)
            // but merge in fresh team data from API for budget accuracy
            finalAuction = {
              ...persistedState,
              name: auctionData.name,
            }
            // Switch to auction tab if it was live
            setActiveTab('auction')
          } else {
            // Transform API data to match the AuctionState interface
            finalAuction = {
              id: auctionData.id,
              name: auctionData.name,
              teams: auctionData.teams?.map((team: any) => ({
                name: team.name,
                coins: team.budgetRemaining || auctionData.budgetPerTeam,
                originalCoins: auctionData.budgetPerTeam,
                players: []
              })) || [],
              auctionQueue: [],
              auctionIndex: 0,
              auctionStarted: false,
              soldPlayers: {},
              unsoldPlayers: [],
              deferredPlayers: [],
              auctionHistory: [],
              lastUpdated: new Date().toISOString()
            }
          }

          setAuction(finalAuction)

          // Store API tiers and players
          if (auctionData.tiers) setApiTiers(auctionData.tiers)
          if (auctionData.players) setApiPlayers(auctionData.players)
          if (auctionData.playerStats) setApiPlayerStats(auctionData.playerStats)

          setLoading(false)
        } else {
          console.error('Failed to fetch auction data from API', response.status, response.statusText)

          // More specific error messages
          if (response.status === 404) {
            setError('Auction not found')
          } else if (response.status >= 500) {
            setError('Server error. Please try again in a moment.')
          } else {
            setError(`Failed to load auction (${response.status})`)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error loading auction data:', error)
        setError('Failed to connect to server. Please check database connection.')
        setLoading(false)
      }
    }

    // Load auction data immediately
    loadAuctionData()

    // Subscribe to real-time updates as fallback/secondary
    auctionRealtimeManager.subscribeToAuction(auctionId)

    // Set up callbacks for real-time updates
    auctionRealtimeManager.onAuctionStateChange(setAuction)
    auctionRealtimeManager.onBidsChange(setCurrentBids)

    return () => {
      auctionRealtimeManager.unsubscribe()
    }
  }, [auctionId])

  const saveAuction = async (updatedAuction: AuctionState) => {
    try {
      // Persist runtime state to database
      persistAuctionState(updatedAuction)

      // Save team budgets to database
      await fetch(`/api/auctions/${auctionId}/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams: updatedAuction.teams.map(team => ({
            name: team.name,
            primaryColor: '#3B82F6',
            secondaryColor: '#1B2A4A',
            budgetRemaining: team.coins
          }))
        })
      })

      // Also broadcast to real-time for live updates
      await auctionRealtimeManager.broadcastAuctionState(updatedAuction)
    } catch (error) {
      console.error('Failed to save auction:', error)
    }
  }


  const handleStartAuction = async () => {
    if (!auction) return

    let auctionQueue: string[]

    if (shuffleMode === 'tier-ordered' && apiPlayers.length > 0 && tierOrder.length > 0) {
      // Group players by tier, shuffle within each tier, then concatenate in tier order
      const playersByTier = new Map<string, string[]>()
      for (const player of apiPlayers) {
        const tierId = player.tier?.id
        if (!tierId) continue
        if (!playersByTier.has(tierId)) playersByTier.set(tierId, [])
        playersByTier.get(tierId)!.push(player.name)
      }
      // Add any players without a tier
      const playersWithoutTier = apiPlayers.filter((p: any) => !p.tier?.id).map((p: any) => p.name)

      auctionQueue = []
      for (const tier of tierOrder) {
        const tierPlayers = playersByTier.get(tier.tierId) || []
        auctionQueue.push(...fisherYatesShuffle(tierPlayers))
      }
      // Append players without a tier at the end
      if (playersWithoutTier.length > 0) {
        auctionQueue.push(...fisherYatesShuffle(playersWithoutTier))
      }
    } else {
      // Fully random: shuffle all players
      const playerNames = apiPlayers.length > 0
        ? apiPlayers.map((p: any) => p.name)
        : players.map(p => p.name)
      auctionQueue = fisherYatesShuffle(playerNames)
    }

    const updatedAuction = {
      ...auction,
      auctionQueue,
      auctionStarted: true,
      auctionIndex: 0
    }

    setAuction(updatedAuction)
    setActiveTab('auction')

    // Save runtime state + set status to LIVE in one call
    try {
      await fetch(`/api/auctions/${auctionId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtimeState: updatedAuction, status: 'LIVE' })
      })
    } catch (e) {
      console.error('Failed to save auction state:', e)
    }

    // Also save team budgets
    saveAuction(updatedAuction)
  }

  // --- Auction action handlers ---
  const currentPlayerName = auction?.auctionQueue?.[auction?.auctionIndex ?? 0] ?? ''

  const handleSold = () => {
    if (!auction || !sellTeam) return

    const playerName = auction.auctionQueue[auction.auctionIndex]
    const price = sellPrice || getPlayerInfo(playerName).basePrice

    const updatedTeams = auction.teams.map(team => {
      if (team.name === sellTeam) {
        return {
          ...team,
          coins: team.coins - price,
          players: [...team.players, { name: playerName, price }]
        }
      }
      return team
    })

    const updatedAuction: AuctionState = {
      ...auction,
      teams: updatedTeams,
      soldPlayers: { ...auction.soldPlayers, [playerName]: { team: sellTeam, price } },
      auctionHistory: [...auction.auctionHistory, { player: playerName, team: sellTeam, price, action: 'SOLD' }],
      auctionIndex: auction.auctionIndex + 1,
      lastUpdated: new Date().toISOString()
    }

    setAuction(updatedAuction)
    saveAuction(updatedAuction)
    setSellTeam('')
    setSellPrice(0)
  }

  const handleUnsold = () => {
    if (!auction) return

    const playerName = auction.auctionQueue[auction.auctionIndex]

    const updatedAuction: AuctionState = {
      ...auction,
      unsoldPlayers: [...auction.unsoldPlayers, playerName],
      auctionHistory: [...auction.auctionHistory, { player: playerName, team: '', price: 0, action: 'UNSOLD' }],
      auctionIndex: auction.auctionIndex + 1,
      lastUpdated: new Date().toISOString()
    }

    setAuction(updatedAuction)
    saveAuction(updatedAuction)
  }

  const handleDefer = () => {
    if (!auction) return

    const playerName = auction.auctionQueue[auction.auctionIndex]

    // Move player to end of queue
    const newQueue = [...auction.auctionQueue]
    newQueue.splice(auction.auctionIndex, 1)
    newQueue.push(playerName)

    const updatedAuction: AuctionState = {
      ...auction,
      auctionQueue: newQueue,
      deferredPlayers: [...auction.deferredPlayers, playerName],
      auctionHistory: [...auction.auctionHistory, { player: playerName, team: '', price: 0, action: 'DEFERRED' }],
      lastUpdated: new Date().toISOString()
      // Note: auctionIndex stays the same since we removed the current player
    }

    setAuction(updatedAuction)
    saveAuction(updatedAuction)
  }

  const handleUndoLast = () => {
    if (!auction || auction.auctionHistory.length === 0) return

    const lastAction = auction.auctionHistory[auction.auctionHistory.length - 1]
    const newHistory = auction.auctionHistory.slice(0, -1)

    let updatedAuction: AuctionState = {
      ...auction,
      auctionHistory: newHistory,
      lastUpdated: new Date().toISOString()
    }

    if (lastAction.action === 'SOLD') {
      // Undo sold: restore team budget, remove player from team, move index back
      const updatedTeams = auction.teams.map(team => {
        if (team.name === lastAction.team) {
          return {
            ...team,
            coins: team.coins + lastAction.price,
            players: team.players.filter(p => p.name !== lastAction.player)
          }
        }
        return team
      })
      const { [lastAction.player]: _, ...remainingSold } = auction.soldPlayers
      updatedAuction = {
        ...updatedAuction,
        teams: updatedTeams,
        soldPlayers: remainingSold,
        auctionIndex: auction.auctionIndex - 1,
      }
    } else if (lastAction.action === 'UNSOLD') {
      // Undo unsold: remove from unsold list, move index back
      updatedAuction = {
        ...updatedAuction,
        unsoldPlayers: auction.unsoldPlayers.filter(p => p !== lastAction.player),
        auctionIndex: auction.auctionIndex - 1,
      }
    } else if (lastAction.action === 'DEFERRED') {
      // Undo defer: remove from end of queue and put back at current position
      const newQueue = [...auction.auctionQueue]
      const deferredIdx = newQueue.lastIndexOf(lastAction.player)
      if (deferredIdx !== -1) {
        newQueue.splice(deferredIdx, 1)
        newQueue.splice(auction.auctionIndex, 0, lastAction.player)
      }
      updatedAuction = {
        ...updatedAuction,
        auctionQueue: newQueue,
        deferredPlayers: auction.deferredPlayers.filter(p => p !== lastAction.player),
      }
    }

    setAuction(updatedAuction)
    saveAuction(updatedAuction)
  }

  // Helper to look up player info by name from API or fallback data
  const getPlayerInfo = (name: string) => {
    if (apiPlayers.length > 0) {
      const p = apiPlayers.find((ap: any) => ap.name === name)
      if (p) return { tier: p.tier?.name || '?', basePrice: p.tier?.basePrice || 0 }
    }
    const p = players.find(fp => fp.name === name)
    if (p) return { tier: `Tier ${p.tier}`, basePrice: p.basePrice }
    return { tier: '?', basePrice: 0 }
  }

  const getTierStats = () => {
    return players.reduce((acc, player) => {
      acc[`tier${player.tier}`] = (acc[`tier${player.tier}`] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const tierStats = getTierStats()

  // Find full player data from name (for auction interface)
  const findPlayerByName = (playerName: string): Player | null => {
    // First check demo players
    const demoPlayer = players.find(p => p.name === playerName)
    if (demoPlayer) return demoPlayer

    // Then check API players and convert to Player format
    const apiPlayer = apiPlayers.find((p: any) => p.name === playerName)
    if (apiPlayer) {
      return {
        name: apiPlayer.name,
        tier: apiPlayer.tier ? (apiPlayer.tier.name === 'Tier 0' ? 0 : apiPlayer.tier.name === 'Tier 1' ? 1 : apiPlayer.tier.name === 'Tier 2' ? 2 : 3) as 0 | 1 | 2 | 3 : 0,
        basePrice: apiPlayer.tier?.basePrice || 30,
        note: apiPlayer.customTags ? apiPlayer.customTags.split(',')[0]?.trim() || null : null,
        playingRole: (apiPlayer.playingRole || 'BATSMAN') as 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER'
      }
    }

    return null
  }

  // Player editing handlers
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player)
    const roles = player.playingRole.split(',').map(r => r.trim()).filter(r => r)
    setSelectedRoles(roles.length > 0 ? roles : ['BATSMAN'])
    setEditPlayerForm({
      name: player.name,
      playingRole: player.playingRole,
      tier: player.tier,
      basePrice: player.basePrice,
      note: player.note || ''
    })
  }

  // Edit player by name (for auction interface)
  const handleEditPlayerByName = (playerName: string) => {
    const player = findPlayerByName(playerName)
    if (player) {
      handleEditPlayer(player)
    }
  }

  // Edit API player (for database players)
  const handleEditApiPlayer = (apiPlayer: any) => {
    // Extract roles and notes from customTags
    const validRoles = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']
    const customTagsArray = apiPlayer.customTags ? apiPlayer.customTags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : []

    // Separate roles from other tags
    const rolesFromTags = customTagsArray.filter((tag: string) => validRoles.includes(tag))
    const notesFromTags = customTagsArray.filter((tag: string) => !validRoles.includes(tag))

    // Combine primary role with roles from tags
    const allRoles = [apiPlayer.playingRole, ...rolesFromTags].filter(Boolean)
    const uniqueRoles = [...new Set(allRoles)] // Remove duplicates

    const player: Player = {
      name: apiPlayer.name,
      tier: apiPlayer.tier ? (apiPlayer.tier.name === 'Tier 0' ? 0 : apiPlayer.tier.name === 'Tier 1' ? 1 : apiPlayer.tier.name === 'Tier 2' ? 2 : 3) as 0 | 1 | 2 | 3 : 0,
      basePrice: apiPlayer.tier?.basePrice || 30,
      note: notesFromTags.length > 0 ? notesFromTags.join(', ') : null,
      playingRole: uniqueRoles.join(',') || 'BATSMAN'
    }
    handleEditPlayer(player)
  }

  const handleSavePlayer = async () => {
    if (!editingPlayer) return

    const combinedRoles = selectedRoles.join(',')
    const updatedPlayer = {
      ...editingPlayer,
      name: editPlayerForm.name,
      playingRole: combinedRoles,
      tier: editPlayerForm.tier,
      basePrice: editPlayerForm.basePrice,
      note: editPlayerForm.note || null
    }

    // Check if this is an API player or demo player
    const apiPlayer = apiPlayers.find((p: any) => p.name === editingPlayer.name)

    if (apiPlayer) {
      // Update API player in database
      try {
        const response = await fetch(`/api/auctions/${auctionId}/players/${apiPlayer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editPlayerForm.name,
            playingRole: combinedRoles,
            customTags: editPlayerForm.note || '',
            // Note: tier and basePrice are handled via tier relationship in the database
          })
        })

        if (response.ok) {
          const result = await response.json()
          // Reload the API players to get the updated data from the server
          // This ensures we have the correct customTags with roles properly stored
          const playersResponse = await fetch(`/api/auctions/${auctionId}/players/import`)
          if (playersResponse.ok) {
            const playersData = await playersResponse.json()
            setApiPlayers(playersData.players)
          }
        } else {
          const errorData = await response.json()
          console.error('Failed to update player in database:', errorData.error)
        }
      } catch (error) {
        console.error('Error updating player:', error)
      }
    } else {
      // Update demo player locally
      const updatedPlayers = players.map(player =>
        player.name === editingPlayer.name ? updatedPlayer : player
      )
      setPlayers(updatedPlayers)
    }

    setEditingPlayer(null)
    setEditPlayerForm({
      name: '',
      playingRole: 'BATSMAN',
      tier: 0,
      basePrice: 30,
      note: ''
    })
    setSelectedRoles(['BATSMAN'])
  }

  const handleDeletePlayer = () => {
    if (!editingPlayer) return

    const updatedPlayers = players.filter(player => player.name !== editingPlayer.name)
    setPlayers(updatedPlayers)
    setEditingPlayer(null)
    setEditPlayerForm({
      name: '',
      playingRole: 'BATSMAN',
      tier: 0,
      basePrice: 30,
      note: ''
    })
  }

  const handleMoveTier = (player: Player, direction: 'up' | 'down') => {
    const newTier = direction === 'up'
      ? Math.max(0, player.tier - 1) as 0 | 1 | 2 | 3
      : Math.min(3, player.tier + 1) as 0 | 1 | 2 | 3

    if (newTier === player.tier) return

    const basePrices = { 0: 120, 1: 90, 2: 60, 3: 30 }

    const updatedPlayers = players.map(p =>
      p.name === player.name
        ? { ...p, tier: newTier, basePrice: basePrices[newTier] }
        : p
    )

    setPlayers(updatedPlayers)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loading auction...</h1>
          <p className="text-muted-foreground">Please wait while we load your auction data.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error loading auction</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-y-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Retry Loading
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              Go Back
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Auction ID: {auctionId}
          </p>
        </div>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Auction not found</h1>
          <p className="text-muted-foreground">The auction you're looking for doesn't exist or couldn't be loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{auction.name}</h1>
              <p className="text-sm text-muted-foreground">
                {auction.teams.length} teams • {apiPlayers.length > 0 ? apiPlayers.length : players.length} players
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={auction.auctionStarted ? 'default' : 'secondary'}>
                {auction.auctionStarted ? 'Live' : 'Setup'}
              </Badge>
              {!auction.auctionStarted && (
                <Button
                  onClick={handleStartAuction}
                  disabled={auction.teams.length < 2}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Auction
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="auction" disabled={!auction.auctionStarted}>Auction</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            {/* Team Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AuctionTeamManager
                  auctionId={auctionId}
                  auctionName={auction.name}
                  availableMembers={(auction as any).participations?.map((p: any) => ({
                    id: p.user.id,
                    name: p.user.name,
                    email: p.user.email,
                    image: p.user.image
                  })) || []}
                  onTeamChange={async () => {
                    // Reload auction data to get updated teams
                    try {
                      const response = await fetch(`/api/auctions/${auctionId}`)
                      const data = await response.json()

                      const transformedAuction: AuctionState = {
                        id: data.id,
                        name: data.name,
                        teams: data.teams?.map((team: any) => ({
                          name: team.name,
                          coins: team.budgetRemaining || data.budgetPerTeam,
                          originalCoins: data.budgetPerTeam,
                          players: team.players?.map((p: any) => ({
                            name: p.name,
                            price: 0,
                          })) || []
                        })) || [],
                        auctionQueue: auction.auctionQueue || [],
                        auctionIndex: auction.auctionIndex || 0,
                        auctionStarted: auction.auctionStarted,
                        soldPlayers: auction.soldPlayers || {},
                        unsoldPlayers: auction.unsoldPlayers || [],
                        deferredPlayers: auction.deferredPlayers || [],
                        auctionHistory: auction.auctionHistory || [],
                        lastUpdated: new Date().toISOString()
                      }

                      setAuction(transformedAuction)
                      auctionRealtimeManager.broadcastAuctionState(transformedAuction)
                    } catch (error) {
                      console.error('Failed to reload auction data:', error)
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Share Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Share Auction Links</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    {/* Captain Link */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-blue-900">Captain Dashboard</h4>
                          <p className="text-sm text-blue-700">For team captains to place bids</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant={copiedLink === 'captain' ? 'default' : 'outline'}
                            size="sm"
                            className={copiedLink === 'captain' ? 'bg-blue-600 text-white' : 'border-blue-300 text-blue-700 hover:bg-blue-100'}
                            onClick={() => copyToClipboard(`${window.location.origin}/captain/${auctionId}`, 'captain')}
                          >
                            {copiedLink === 'captain' ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-700 hover:bg-blue-100"
                            onClick={() => window.open(`${window.location.origin}/captain/${auctionId}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" /> Open
                          </Button>
                        </div>
                      </div>
                      <code className="text-sm bg-white text-gray-800 px-3 py-2 rounded border font-mono break-all block">
                        {typeof window !== 'undefined' && `${window.location.origin}/captain/${auctionId}`}
                      </code>
                    </div>

                    {/* Live View Link */}
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-red-900">Live Spectator View</h4>
                          <p className="text-sm text-red-700">For viewers to watch the auction live</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant={copiedLink === 'live' ? 'default' : 'outline'}
                            size="sm"
                            className={copiedLink === 'live' ? 'bg-red-600 text-white' : 'border-red-300 text-red-700 hover:bg-red-100'}
                            onClick={() => copyToClipboard(`${window.location.origin}/live/${auctionId}`, 'live')}
                          >
                            {copiedLink === 'live' ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-700 hover:bg-red-100"
                            onClick={() => window.open(`${window.location.origin}/live/${auctionId}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" /> Open
                          </Button>
                        </div>
                      </div>
                      <code className="text-sm bg-white text-gray-800 px-3 py-2 rounded border font-mono break-all block">
                        {typeof window !== 'undefined' && `${window.location.origin}/live/${auctionId}`}
                      </code>
                    </div>

                    {/* Auctioneer Link */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-green-900">Auctioneer Dashboard</h4>
                          <p className="text-sm text-green-700">Current page - for co-auctioneers</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant={copiedLink === 'auctioneer' ? 'default' : 'outline'}
                            size="sm"
                            className={copiedLink === 'auctioneer' ? 'bg-green-600 text-white' : 'border-green-300 text-green-700 hover:bg-green-100'}
                            onClick={() => copyToClipboard(window.location.href, 'auctioneer')}
                          >
                            {copiedLink === 'auctioneer' ? <><Check className="h-4 w-4 mr-1" /> Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-300 text-green-700 hover:bg-green-100"
                            onClick={() => window.open(window.location.href, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" /> Open
                          </Button>
                        </div>
                      </div>
                      <code className="text-sm bg-white text-gray-800 px-3 py-2 rounded border font-mono break-all block">
                        {typeof window !== 'undefined' && window.location.href}
                      </code>
                    </div>
                  </div>

                  {/* Quick Share All */}
                  <div className="pt-4 border-t">
                    <Button
                      className="w-full"
                      variant={copiedLink === 'all' ? 'default' : 'outline'}
                      onClick={() => {
                        const captainUrl = `${window.location.origin}/captain/${auctionId}`
                        const liveUrl = `${window.location.origin}/live/${auctionId}`
                        const auctioneerUrl = window.location.href

                        const message = `${auction?.name} - Cricket Auction Links:

CAPTAINS (for bidding):
${captainUrl}

SPECTATORS (live view):
${liveUrl}

AUCTIONEERS (control panel):
${auctioneerUrl}`

                        copyToClipboard(message, 'all')
                      }}
                    >
                      {copiedLink === 'all' ? <><Check className="h-4 w-4 mr-1" /> All Links Copied</> : <><Copy className="h-4 w-4 mr-1" /> Copy All Links</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>View Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Customize what information is displayed for each type of user (Auctioneer, Captains, Public)
                </p>
                <ViewConfigDialog auctionId={auctionId} />
              </CardContent>
            </Card>

            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex-col">
                      <Users className="h-6 w-6 mb-2" />
                      <span className="font-medium">Invite Captains</span>
                      <span className="text-xs text-muted-foreground">Send email invitations</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col" onClick={() => setUploadUserListOpen(true)}>
                      <Upload className="h-6 w-6 mb-2" />
                      <span className="font-medium">Upload User List</span>
                      <span className="text-xs text-muted-foreground">CSV with emails</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Download className="h-6 w-6 mb-2" />
                      <span className="font-medium">Import from League</span>
                      <span className="text-xs text-muted-foreground">League members</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col">
                      <Settings className="h-6 w-6 mb-2" />
                      <span className="font-medium">Manage Roles</span>
                      <span className="text-xs text-muted-foreground">Set permissions</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auction History */}
            <Card>
              <CardHeader>
                <CardTitle>Auction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Previous auctions will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Players Tab */}
          <TabsContent value="players" className="space-y-6">
            {showPlayerImport ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Import Players</h2>
                  <Button variant="outline" onClick={() => setShowPlayerImport(false)}>
                    Back to Player Pool
                  </Button>
                </div>
                <PlayerImport
                  auctionId={auctionId}
                  tiers={apiTiers}
                  existingPlayers={apiPlayers.length}
                  onImportComplete={async () => {
                    // Reload players from API
                    try {
                      const response = await fetch(`/api/auctions/${auctionId}`)
                      if (response.ok) {
                        const data = await response.json()
                        if (data.tiers) setApiTiers(data.tiers)
                        if (data.players) setApiPlayers(data.players)
                        if (data.playerStats) setApiPlayerStats(data.playerStats)
                      }
                    } catch (e) {
                      console.error('Failed to reload players:', e)
                    }
                    setShowPlayerImport(false)
                  }}
                />
              </>
            ) : (
              <>
                {/* Tier Stats */}
                {apiTiers.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {apiTiers.map((tier) => {
                      const count = apiPlayers.filter((p: any) => p.tier?.id === tier.id).length
                      return (
                        <Card key={tier.id}>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold" style={{ color: tier.color }}>
                              {tier.name}
                            </div>
                            <div className="text-sm text-muted-foreground">{count} players</div>
                            <div className="text-xs text-muted-foreground">Base: {tier.basePrice}</div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { name: 'Tier 0', color: 'text-yellow-600', base: 120, key: 'tier0' },
                      { name: 'Tier 1', color: 'text-orange-600', base: 90, key: 'tier1' },
                      { name: 'Tier 2', color: 'text-blue-600', base: 60, key: 'tier2' },
                      { name: 'Tier 3', color: 'text-green-600', base: 30, key: 'tier3' },
                    ].map((t) => (
                      <Card key={t.key}>
                        <CardContent className="p-4 text-center">
                          <div className={`text-2xl font-bold ${t.color}`}>{t.name}</div>
                          <div className="text-sm text-muted-foreground">{tierStats[t.key] || 0} players</div>
                          <div className="text-xs text-muted-foreground">Base: {t.base}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Player Pool */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Player Pool ({apiPlayers.length > 0 ? apiPlayers.length : players.length})</span>
                      <div className="flex items-center space-x-2">
                        {apiPlayers.length === 0 && players.length === 0 && (
                          <Button variant="outline" size="sm" onClick={() => setPlayers(DEFAULT_PLAYERS)}>
                            <Users className="h-4 w-4 mr-2" />
                            Load Demo Players
                          </Button>
                        )}
                        {players.length > 0 && (
                          <Button variant="outline" size="sm" onClick={() => setPlayers([])}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Demo Players
                          </Button>
                        )}
                        {(apiPlayers.length > 0 || players.length > 0) && players.length === 0 && (
                          <Button variant="outline" size="sm" onClick={() => setPlayers(DEFAULT_PLAYERS)}>
                            <Users className="h-4 w-4 mr-2" />
                            Add Demo Players
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setShowPlayerImport(true)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setShowPlayerImport(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Player
                        </Button>
                      </div>
                    </CardTitle>
                    {(apiPlayers.length > 0 || players.length > 0) && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search players..."
                          className="pl-9"
                          value={playerSearchTerm}
                          onChange={(e) => setPlayerSearchTerm(e.target.value)}
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {apiPlayers.length > 0 ? (
                      (() => {
                        // Check if we have any results after filtering
                        const hasResults = apiTiers.some((tier) => {
                          let tierPlayers = apiPlayers.filter((p: any) => p.tier?.id === tier.id)
                          if (playerSearchTerm.trim()) {
                            tierPlayers = tierPlayers.filter((p: any) =>
                              p.name?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                              p.playingRole?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                              p.customTags?.toLowerCase().includes(playerSearchTerm.toLowerCase())
                            )
                          }
                          return tierPlayers.length > 0
                        })

                        if (!hasResults && playerSearchTerm.trim()) {
                          return (
                            <div className="text-center py-12 text-muted-foreground">
                              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p className="text-lg font-medium mb-2">No players found</p>
                              <p className="text-sm">Try searching with a different term</p>
                            </div>
                          )
                        }

                        return (
                      <div className="space-y-4">
                        {apiTiers.map((tier) => {
                          let tierPlayers = apiPlayers.filter((p: any) => p.tier?.id === tier.id)

                          // Apply search filter
                          if (playerSearchTerm.trim()) {
                            tierPlayers = tierPlayers.filter((p: any) =>
                              p.name?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                              p.playingRole?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                              p.customTags?.toLowerCase().includes(playerSearchTerm.toLowerCase())
                            )
                          }

                          if (tierPlayers.length === 0) return null
                          return (
                            <div key={tier.id}>
                              <h3 className="font-medium mb-2 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color }} />
                                {tier.name}
                                <span className="text-xs text-muted-foreground">({tierPlayers.length} players, base: {tier.basePrice})</span>
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {tierPlayers.map((player: any) => (
                                  <div key={player.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer group"
                                       onClick={() => handleEditApiPlayer(player)}>
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{player.name}</div>
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {player.playingRole && (
                                          <Badge variant="secondary" className="text-xs">
                                            {player.playingRole.replace('_', ' ')}
                                          </Badge>
                                        )}
                                        {player.customTags && player.customTags.split(',').slice(0, 2).map((tag: string, i: number) => (
                                          <Badge key={i} variant="outline" className="text-xs">
                                            {tag.trim()}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <div className="text-sm text-muted-foreground mr-2">
                                        {tier.basePrice}
                                      </div>
                                      <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                        )
                      })()
                    ) : players.length > 0 ? (
                      (() => {
                        // Check if we have any results after filtering
                        const hasResults = [0, 1, 2, 3].some(tierNum => {
                          let tierPlayers = players.filter(p => p.tier === tierNum)
                          if (playerSearchTerm.trim()) {
                            tierPlayers = tierPlayers.filter((p: Player) =>
                              p.name?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                              p.playingRole?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                              p.note?.toLowerCase().includes(playerSearchTerm.toLowerCase())
                            )
                          }
                          return tierPlayers.length > 0
                        })

                        if (!hasResults && playerSearchTerm.trim()) {
                          return (
                            <div className="text-center py-12 text-muted-foreground">
                              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              <p className="text-lg font-medium mb-2">No players found</p>
                              <p className="text-sm">Try searching with a different term</p>
                            </div>
                          )
                        }

                        return (
                      <div className="space-y-4">
                        {[0, 1, 2, 3].map(tierNum => {
                          let tierPlayers = players.filter(p => p.tier === tierNum)

                          // Apply search filter
                          if (playerSearchTerm.trim()) {
                            tierPlayers = tierPlayers.filter((p: Player) =>
                              p.name?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                              p.playingRole?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                              p.note?.toLowerCase().includes(playerSearchTerm.toLowerCase())
                            )
                          }

                          if (tierPlayers.length === 0) return null

                          return (
                          <div key={tierNum}>
                            <h3 className="font-medium mb-2">Tier {tierNum} ({tierPlayers.length} players)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {tierPlayers.map((player, index) => (
                                <div key={index} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer group"
                                     onClick={() => handleEditPlayer(player)}>
                                  <div>
                                    <div className="font-medium">{player.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {player.playingRole.replace('_', ' ')}
                                      </Badge>
                                      {player.note && (
                                        <Badge variant="secondary" className="text-xs">
                                          {player.note}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="text-sm text-muted-foreground mr-2">
                                      {player.basePrice}
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        disabled={player.tier === 0}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleMoveTier(player, 'up')
                                        }}
                                      >
                                        <ArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0"
                                        disabled={player.tier === 3}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleMoveTier(player, 'down')
                                        }}
                                      >
                                        <ArrowDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <Edit className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          )
                        })}
                      </div>
                        )
                      })()
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No players added yet</p>
                        <p className="text-sm">Add players to your auction using the buttons above</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Auction Tab */}
          <TabsContent value="auction">
            {auction.auctionStarted ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Auction Controls */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Current Player */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Now Auctioning</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {auction.auctionIndex < auction.auctionQueue.length ? (
                        <div className="text-center">
                          <div className="mb-4">
                            <h2 className="text-3xl font-bold">{auction.auctionQueue[auction.auctionIndex]}</h2>
                            <div className="flex items-center justify-center space-x-4 mt-2">
                              <Badge>{getPlayerInfo(auction.auctionQueue[auction.auctionIndex]).tier}</Badge>
                              <Badge variant="secondary">Base: {getPlayerInfo(auction.auctionQueue[auction.auctionIndex]).basePrice}</Badge>
                            </div>
                          </div>

                          {/* Sell Controls */}
                          <div className="space-y-4">
                            <div className="flex items-center space-x-4 justify-center">
                              <Input
                                type="number"
                                placeholder="Price"
                                className="w-24"
                                value={sellPrice || getPlayerInfo(auction.auctionQueue[auction.auctionIndex]).basePrice}
                                onChange={(e) => setSellPrice(Number(e.target.value))}
                              />
                              <select
                                className="border rounded px-3 py-2 bg-background text-foreground"
                                value={sellTeam}
                                onChange={(e) => setSellTeam(e.target.value)}
                              >
                                <option value="">Select Team</option>
                                {auction.teams.map((team, i) => (
                                  <option key={i} value={team.name}>
                                    {team.name} ({team.coins} coins)
                                  </option>
                                ))}
                              </select>
                              <Button
                                className="bg-green-600 hover:bg-green-700"
                                disabled={!sellTeam}
                                onClick={handleSold}
                              >
                                Sold
                              </Button>
                            </div>

                            <div className="flex items-center justify-center space-x-2">
                              <Button variant="outline" onClick={handleDefer}>
                                Defer to End
                              </Button>
                              <Button variant="outline" onClick={handleUnsold}>
                                Unsold
                              </Button>
                              <Button variant="outline" disabled={auction.auctionHistory.length === 0} onClick={handleUndoLast}>
                                Undo Last
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
                          <h2 className="text-2xl font-bold mb-2">Main Round Complete</h2>
                          <div className="space-x-2">
                            <Button>Bring Back Deferred</Button>
                            <Button variant="outline">Finish Auction</Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Up Next */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Up Next (12 players)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {auction.auctionQueue
                          .slice(auction.auctionIndex + 1, auction.auctionIndex + 13)
                          .map((playerName, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                              <span className="font-medium text-foreground">{playerName}</span>
                              <Badge className="text-xs shrink-0 ml-2" variant="secondary">
                                {getPlayerInfo(playerName).tier}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Team Budgets */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Budgets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {auction.teams.map((team, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{team.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {team.players.length} players
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{team.coins}</div>
                              <div className="text-xs text-muted-foreground">coins</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Sales */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {auction.auctionHistory.length > 0 ? (
                        <div className="space-y-2">
                          {auction.auctionHistory.slice(-8).reverse().map((sale, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="truncate">{sale.player}</span>
                              <span className="font-medium">{sale.price}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No sales yet
                        </div>
                      )}
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
                          <span>{Object.keys(auction.soldPlayers).length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Remaining</span>
                          <span>{auction.auctionQueue.length - auction.auctionIndex}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Deferred</span>
                          <span>{auction.deferredPlayers.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(auction.auctionIndex / auction.auctionQueue.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Start Auction</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {auction.teams.length < 2
                      ? 'Add at least 2 teams to begin the auction'
                      : `Ready with ${auction.teams.length} teams and ${apiPlayers.length > 0 ? apiPlayers.length : players.length} players`
                    }
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Player Order Configuration */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Player Order</h3>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="shuffleMode"
                          value="random"
                          checked={shuffleMode === 'random'}
                          onChange={() => setShuffleMode('random')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <div className="flex items-center space-x-2">
                          <Shuffle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Fully Random</span>
                        </div>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="shuffleMode"
                          value="tier-ordered"
                          checked={shuffleMode === 'tier-ordered'}
                          onChange={() => setShuffleMode('tier-ordered')}
                          disabled={apiTiers.length === 0}
                          className="h-4 w-4 text-blue-600"
                        />
                        <div className="flex items-center space-x-2">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">By Tier Order</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Tier Order List */}
                  {shuffleMode === 'tier-ordered' && tierOrder.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Tier Order</h3>
                      <div className="border rounded-lg divide-y">
                        {tierOrder.map((tier, index) => {
                          const playerCount = apiPlayers.filter((p: any) => p.tier?.id === tier.tierId).length
                          return (
                            <div key={tier.tierId} className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center space-x-3">
                                <span className="text-xs font-mono text-muted-foreground w-5">{index + 1}.</span>
                                <span className="text-sm font-medium">{tier.tierName}</span>
                                <Badge variant="secondary" className="text-xs">
                                  ₹{tier.basePrice}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {playerCount} players
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  disabled={index === 0}
                                  onClick={() => moveTierOrder(index, 'up')}
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  disabled={index === tierOrder.length - 1}
                                  onClick={() => moveTierOrder(index, 'down')}
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Players within each tier are shuffled randomly
                      </p>
                    </div>
                  )}

                  {/* Start Button */}
                  <Button
                    onClick={handleStartAuction}
                    disabled={auction.teams.length < 2}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Auction
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {auction.teams.map((team, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{team.name}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {team.coins} coins remaining • {team.players.length} players
                    </div>
                  </CardHeader>
                  <CardContent>
                    {team.players.length > 0 ? (
                      <div className="space-y-2">
                        {team.players.map((player, pIndex) => (
                          <div key={pIndex} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>{player.name}</span>
                            <Badge variant="secondary">{player.price}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No players acquired yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload User List Dialog */}
      <UploadUserList
        auctionId={auctionId}
        open={uploadUserListOpen}
        onOpenChange={setUploadUserListOpen}
      />

      {/* Player Edit Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Player
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="playerName">Player Name</Label>
              <Input
                id="playerName"
                value={editPlayerForm.name}
                onChange={(e) => setEditPlayerForm({ ...editPlayerForm, name: e.target.value })}
                placeholder="Enter player name"
              />
            </div>

            <div>
              <Label>Playing Roles (select multiple)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER'].map((role) => (
                  <label key={role} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role])
                        } else {
                          setSelectedRoles(selectedRoles.filter(r => r !== role))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{role.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
              {selectedRoles.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Select at least one playing role</p>
              )}
            </div>

            <div>
              <Label htmlFor="tier">Tier</Label>
              <Select value={editPlayerForm.tier.toString()} onValueChange={(value) =>
                setEditPlayerForm({ ...editPlayerForm, tier: parseInt(value) as 0 | 1 | 2 | 3, basePrice: { 0: 120, 1: 90, 2: 60, 3: 30 }[parseInt(value) as 0 | 1 | 2 | 3] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tier 0 (Base: 120)</SelectItem>
                  <SelectItem value="1">Tier 1 (Base: 90)</SelectItem>
                  <SelectItem value="2">Tier 2 (Base: 60)</SelectItem>
                  <SelectItem value="3">Tier 3 (Base: 30)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="basePrice">Base Price</Label>
              <Input
                id="basePrice"
                type="number"
                value={editPlayerForm.basePrice}
                onChange={(e) => setEditPlayerForm({ ...editPlayerForm, basePrice: parseInt(e.target.value) || 0 })}
                placeholder="Enter base price"
              />
            </div>

            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Input
                id="note"
                value={editPlayerForm.note}
                onChange={(e) => setEditPlayerForm({ ...editPlayerForm, note: e.target.value })}
                placeholder="Optional note (e.g., Limited, Captain)"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingPlayer(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePlayer}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            <Button onClick={handleSavePlayer} disabled={selectedRoles.length === 0}>
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}