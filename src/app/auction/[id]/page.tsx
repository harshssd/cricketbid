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

// Extracted subcomponents
import { NowAuctioningCard } from '@/components/auction/NowAuctioningCard'
import { AuctionControls } from '@/components/auction/AuctionControls'
import { TeamBudgetsSidebar } from '@/components/auction/TeamBudgetsSidebar'
import { AuctionProgressPanel } from '@/components/auction/AuctionProgressPanel'
import { UpNextQueue } from '@/components/auction/UpNextQueue'
import { ShareLinksPanel } from '@/components/auction/ShareLinksPanel'

interface Player {
  name: string
  tier: 0 | 1 | 2 | 3
  basePrice: number
  note: string | null
  playingRole: string
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
    if (!auctionId) {
      setLoading(false)
      setError('Invalid auction ID')
      return
    }

    const loadAuctionData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/auctions/${auctionId}`)
        if (response.ok) {
          const auctionData = await response.json()
          const persistedState = await loadPersistedState()

          let finalAuction: AuctionState

          if (persistedState && persistedState.auctionStarted && auctionData.status === 'LIVE') {
            finalAuction = {
              ...persistedState,
              name: auctionData.name,
            }
            setActiveTab('auction')
          } else {
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
          if (auctionData.tiers) setApiTiers(auctionData.tiers)
          if (auctionData.players) setApiPlayers(auctionData.players)
          if (auctionData.playerStats) setApiPlayerStats(auctionData.playerStats)
          setLoading(false)
        } else {
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

    loadAuctionData()
    auctionRealtimeManager.subscribeToAuction(auctionId)
    auctionRealtimeManager.onAuctionStateChange(setAuction)
    auctionRealtimeManager.onBidsChange(setCurrentBids)

    return () => {
      auctionRealtimeManager.unsubscribe()
    }
  }, [auctionId])

  const saveAuction = async (updatedAuction: AuctionState) => {
    try {
      persistAuctionState(updatedAuction)
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
      await auctionRealtimeManager.broadcastAuctionState(updatedAuction)
    } catch (error) {
      console.error('Failed to save auction:', error)
    }
  }

  const handleStartAuction = async () => {
    if (!auction) return

    let auctionQueue: string[]

    if (shuffleMode === 'tier-ordered' && apiPlayers.length > 0 && tierOrder.length > 0) {
      const playersByTier = new Map<string, string[]>()
      for (const player of apiPlayers) {
        const tierId = player.tier?.id
        if (!tierId) continue
        if (!playersByTier.has(tierId)) playersByTier.set(tierId, [])
        playersByTier.get(tierId)!.push(player.name)
      }
      const playersWithoutTier = apiPlayers.filter((p: any) => !p.tier?.id).map((p: any) => p.name)

      auctionQueue = []
      for (const tier of tierOrder) {
        const tierPlayers = playersByTier.get(tier.tierId) || []
        auctionQueue.push(...fisherYatesShuffle(tierPlayers))
      }
      if (playersWithoutTier.length > 0) {
        auctionQueue.push(...fisherYatesShuffle(playersWithoutTier))
      }
    } else {
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

    try {
      await fetch(`/api/auctions/${auctionId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtimeState: updatedAuction, status: 'LIVE' })
      })
    } catch (e) {
      console.error('Failed to save auction state:', e)
    }

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

    const newQueue = [...auction.auctionQueue]
    newQueue.splice(auction.auctionIndex, 1)
    newQueue.push(playerName)

    const updatedAuction: AuctionState = {
      ...auction,
      auctionQueue: newQueue,
      deferredPlayers: [...auction.deferredPlayers, playerName],
      auctionHistory: [...auction.auctionHistory, { player: playerName, team: '', price: 0, action: 'DEFERRED' }],
      lastUpdated: new Date().toISOString()
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
      updatedAuction = {
        ...updatedAuction,
        unsoldPlayers: auction.unsoldPlayers.filter(p => p !== lastAction.player),
        auctionIndex: auction.auctionIndex - 1,
      }
    } else if (lastAction.action === 'DEFERRED') {
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

  // Helper to look up player info by name
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

  const findPlayerByName = (playerName: string): Player | null => {
    const demoPlayer = players.find(p => p.name === playerName)
    if (demoPlayer) return demoPlayer
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

  const handleEditApiPlayer = (apiPlayer: any) => {
    const validRoles = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']
    const customTagsArray = apiPlayer.customTags ? apiPlayer.customTags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : []
    const rolesFromTags = customTagsArray.filter((tag: string) => validRoles.includes(tag))
    const notesFromTags = customTagsArray.filter((tag: string) => !validRoles.includes(tag))
    const allRoles = [apiPlayer.playingRole, ...rolesFromTags].filter(Boolean)
    const uniqueRoles = [...new Set(allRoles)]

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
    const apiPlayer = apiPlayers.find((p: any) => p.name === editingPlayer.name)

    if (apiPlayer) {
      try {
        const response = await fetch(`/api/auctions/${auctionId}/players/${apiPlayer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editPlayerForm.name,
            playingRole: combinedRoles,
            customTags: editPlayerForm.note || '',
          })
        })

        if (response.ok) {
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
      const updatedPlayer = {
        ...editingPlayer,
        name: editPlayerForm.name,
        playingRole: combinedRoles,
        tier: editPlayerForm.tier,
        basePrice: editPlayerForm.basePrice,
        note: editPlayerForm.note || null
      }
      const updatedPlayers = players.map(player =>
        player.name === editingPlayer.name ? updatedPlayer : player
      )
      setPlayers(updatedPlayers)
    }

    setEditingPlayer(null)
    setEditPlayerForm({ name: '', playingRole: 'BATSMAN', tier: 0, basePrice: 30, note: '' })
    setSelectedRoles(['BATSMAN'])
  }

  const handleDeletePlayer = () => {
    if (!editingPlayer) return
    const updatedPlayers = players.filter(player => player.name !== editingPlayer.name)
    setPlayers(updatedPlayers)
    setEditingPlayer(null)
    setEditPlayerForm({ name: '', playingRole: 'BATSMAN', tier: 0, basePrice: 30, note: '' })
  }

  const handleMoveTier = (player: Player, direction: 'up' | 'down') => {
    const newTier = direction === 'up'
      ? Math.max(0, player.tier - 1) as 0 | 1 | 2 | 3
      : Math.min(3, player.tier + 1) as 0 | 1 | 2 | 3
    if (newTier === player.tier) return
    const basePrices = { 0: 120, 1: 90, 2: 60, 3: 30 }
    const updatedPlayers = players.map(p =>
      p.name === player.name ? { ...p, tier: newTier, basePrice: basePrices[newTier] } : p
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
          <h1 className="text-2xl font-bold text-destructive mb-2">Error loading auction</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">Retry Loading</Button>
            <Button variant="outline" onClick={() => window.history.back()} className="w-full">Go Back</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Auction ID: {auctionId}</p>
        </div>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Auction not found</h1>
          <p className="text-muted-foreground">The auction you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
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
                          players: team.players?.map((p: any) => ({ name: p.name, price: 0 })) || []
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

            {/* Share Links — compact version */}
            <ShareLinksPanel auctionId={auctionId} auctionName={auction.name} />

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
                            <div className="text-2xl font-bold" style={{ color: tier.color }}>{tier.name}</div>
                            <div className="text-sm text-muted-foreground">{count} players</div>
                            <div className="text-xs text-muted-foreground tabular-nums">Base: {tier.basePrice}</div>
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
                          <div className="text-xs text-muted-foreground tabular-nums">Base: {t.base}</div>
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
                                      <div key={player.id} className="flex items-center justify-between p-2 border rounded hover:bg-muted hover:border-ring transition-colors cursor-pointer group"
                                           onClick={() => handleEditApiPlayer(player)}>
                                        <div className="min-w-0">
                                          <div className="font-medium truncate">{player.name}</div>
                                          <div className="flex flex-wrap gap-1 mt-0.5">
                                            {player.playingRole && (
                                              <Badge variant="secondary" className="text-xs">{player.playingRole.replace('_', ' ')}</Badge>
                                            )}
                                            {player.customTags && player.customTags.split(',').slice(0, 2).map((tag: string, i: number) => (
                                              <Badge key={i} variant="outline" className="text-xs">{tag.trim()}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <div className="text-sm text-muted-foreground mr-2 tabular-nums">{tier.basePrice}</div>
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
                                      <div key={index} className="flex items-center justify-between p-2 border rounded hover:bg-muted hover:border-ring transition-colors cursor-pointer group"
                                           onClick={() => handleEditPlayer(player)}>
                                        <div>
                                          <div className="font-medium">{player.name}</div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">{player.playingRole.replace('_', ' ')}</Badge>
                                            {player.note && (
                                              <Badge variant="secondary" className="text-xs">{player.note}</Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <div className="text-sm text-muted-foreground mr-2 tabular-nums">{player.basePrice}</div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5">
                                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={player.tier === 0}
                                              onClick={(e) => { e.stopPropagation(); handleMoveTier(player, 'up') }}>
                                              <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={player.tier === 3}
                                              onClick={(e) => { e.stopPropagation(); handleMoveTier(player, 'down') }}>
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

          {/* Auction Tab — uses extracted components */}
          <TabsContent value="auction">
            {auction.auctionStarted ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Auction Controls */}
                <div className="lg:col-span-2 space-y-6">
                  <NowAuctioningCard
                    playerName={auction.auctionIndex < auction.auctionQueue.length ? auction.auctionQueue[auction.auctionIndex] : null}
                    tierLabel={auction.auctionIndex < auction.auctionQueue.length ? getPlayerInfo(auction.auctionQueue[auction.auctionIndex]).tier : ''}
                    basePrice={auction.auctionIndex < auction.auctionQueue.length ? getPlayerInfo(auction.auctionQueue[auction.auctionIndex]).basePrice : 0}
                    auctionIndex={auction.auctionIndex}
                    isComplete={auction.auctionIndex >= auction.auctionQueue.length}
                    onBringBackDeferred={() => {}}
                    onFinishAuction={() => {}}
                  >
                    <AuctionControls
                      teams={auction.teams}
                      sellPrice={sellPrice}
                      onSellPriceChange={setSellPrice}
                      sellTeam={sellTeam}
                      onSellTeamChange={setSellTeam}
                      basePrice={auction.auctionIndex < auction.auctionQueue.length ? getPlayerInfo(auction.auctionQueue[auction.auctionIndex]).basePrice : 0}
                      onSold={handleSold}
                      onDefer={handleDefer}
                      onUnsold={handleUnsold}
                      onUndoLast={handleUndoLast}
                      canUndo={auction.auctionHistory.length > 0}
                    />
                  </NowAuctioningCard>

                  <UpNextQueue
                    queue={auction.auctionQueue}
                    startIndex={auction.auctionIndex}
                    getPlayerInfo={getPlayerInfo}
                  />
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <TeamBudgetsSidebar teams={auction.teams} />
                  <AuctionProgressPanel
                    soldCount={Object.keys(auction.soldPlayers).length}
                    remaining={auction.auctionQueue.length - auction.auctionIndex}
                    deferredCount={auction.deferredPlayers.length}
                    progressPercent={(auction.auctionIndex / auction.auctionQueue.length) * 100}
                    recentSales={auction.auctionHistory}
                  />
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
                        <input type="radio" name="shuffleMode" value="random" checked={shuffleMode === 'random'}
                          onChange={() => setShuffleMode('random')} className="h-4 w-4 text-primary" />
                        <div className="flex items-center space-x-2">
                          <Shuffle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Fully Random</span>
                        </div>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input type="radio" name="shuffleMode" value="tier-ordered" checked={shuffleMode === 'tier-ordered'}
                          onChange={() => setShuffleMode('tier-ordered')} disabled={apiTiers.length === 0} className="h-4 w-4 text-primary" />
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
                                <Badge variant="secondary" className="text-xs tabular-nums">{tier.basePrice}</Badge>
                                <Badge variant="outline" className="text-xs">{playerCount} players</Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={index === 0}
                                  onClick={() => moveTierOrder(index, 'up')}>
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={index === tierOrder.length - 1}
                                  onClick={() => moveTierOrder(index, 'down')}>
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">Players within each tier are shuffled randomly</p>
                    </div>
                  )}

                  <Button onClick={handleStartAuction} disabled={auction.teams.length < 2}
                    className="w-full bg-green-600 hover:bg-green-700" size="lg">
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
                    <div className="text-sm text-muted-foreground tabular-nums">
                      {team.coins} coins remaining • {team.players.length} players
                    </div>
                  </CardHeader>
                  <CardContent>
                    {team.players.length > 0 ? (
                      <div className="space-y-2">
                        {team.players.map((player, pIndex) => (
                          <div key={pIndex} className="flex justify-between items-center p-2 bg-muted rounded">
                            <span>{player.name}</span>
                            <Badge variant="secondary" className="tabular-nums">{player.price}</Badge>
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
              <Input id="playerName" value={editPlayerForm.name}
                onChange={(e) => setEditPlayerForm({ ...editPlayerForm, name: e.target.value })} placeholder="Enter player name" />
            </div>
            <div>
              <Label>Playing Roles (select multiple)</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER'].map((role) => (
                  <label key={role} className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={selectedRoles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRoles([...selectedRoles, role])
                        else setSelectedRoles(selectedRoles.filter(r => r !== role))
                      }} className="rounded" />
                    <span className="text-sm">{role.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
              {selectedRoles.length === 0 && (
                <p className="text-xs text-destructive mt-1">Select at least one playing role</p>
              )}
            </div>
            <div>
              <Label htmlFor="tier">Tier</Label>
              <Select value={editPlayerForm.tier.toString()} onValueChange={(value) =>
                setEditPlayerForm({ ...editPlayerForm, tier: parseInt(value) as 0 | 1 | 2 | 3, basePrice: { 0: 120, 1: 90, 2: 60, 3: 30 }[parseInt(value) as 0 | 1 | 2 | 3] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input id="basePrice" type="number" value={editPlayerForm.basePrice}
                onChange={(e) => setEditPlayerForm({ ...editPlayerForm, basePrice: parseInt(e.target.value) || 0 })} placeholder="Enter base price" />
            </div>
            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Input id="note" value={editPlayerForm.note}
                onChange={(e) => setEditPlayerForm({ ...editPlayerForm, note: e.target.value })} placeholder="Optional note (e.g., Limited, Captain)" />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingPlayer(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeletePlayer}>
              <Trash2 className="w-4 h-4 mr-1" />Delete
            </Button>
            <Button onClick={handleSavePlayer} disabled={selectedRoles.length === 0}>
              <Save className="w-4 h-4 mr-1" />Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
