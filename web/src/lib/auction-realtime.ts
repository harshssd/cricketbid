import { createClient } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

// Formal model types — derived from rounds, bids, auction_results, teams
export interface AuctionState {
  id: string
  name: string
  status: string
  teams: TeamState[]
  currentRound: RoundState | null
  soldPlayers: SoldPlayer[]
  unsoldPlayers: string[]
  deferredPlayers: string[]
  auctionHistory: Array<{ player: string; team: string; price: number; action: string }>
  auctionQueue: string[]   // player names in queue order
  auctionIndex: number     // current position in queue
  auctionStarted: boolean
  lastUpdated: string
}

export interface TeamState {
  id: string
  name: string
  coins: number
  originalCoins: number
  players: Array<{ id: string; name: string; price: number; tier?: string }>
}

export interface RoundState {
  id: string
  playerId: string
  playerName: string
  tierId: string
  status: string
  openedAt: string | null
  closedAt: string | null
}

export interface SoldPlayer {
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  price: number
}

export interface FormalBid {
  teamId: string
  teamName: string
  amount: number
  timestamp: string
}

class AuctionRealtimeManager {
  private supabase = createClient()
  private channel: RealtimeChannel | null = null
  private currentAuctionId: string | null = null
  private onStateChangeCallbacks: ((state: AuctionState) => void)[] = []
  private onBidsChangeCallbacks: ((bids: Record<string, FormalBid>) => void)[] = []
  private onBidUpdateCallbacks: ((payload: { roundId: string; teamId: string; teamName: string; amount: number }) => void)[] = []

  // Subscribe to auction changes via postgres_changes + broadcast
  subscribeToAuction(auctionId: string) {
    if (this.channel && this.currentAuctionId === auctionId) {
      return
    }

    this.unsubscribe()
    this.currentAuctionId = auctionId

    let subscribed = false

    this.channel = this.supabase.channel(`auction-${auctionId}`)

    // Listen for broadcast events (auctioneer pushes state updates)
    ;(this.channel as any)
      .on('broadcast', { event: 'auction-state' }, (msg: any) => {
        const state = msg?.payload
        if (state && state.auctionQueue) {
          this.onStateChangeCallbacks.forEach(callback => callback(state))
        }
      })
      .on('broadcast', { event: 'auction-bids' }, (msg: any) => {
        const bids = msg?.payload?.bids
        if (bids) {
          this.onBidsChangeCallbacks.forEach(callback => callback(bids))
        }
      })
      .on('broadcast', { event: 'bid-update' }, (msg: any) => {
        const data = msg?.payload
        if (data?.teamId) {
          this.onBidUpdateCallbacks.forEach(callback => callback(data))
        }
      })
      .subscribe((status: string) => {
        console.log(`Channel auction-${auctionId} status: ${status}`)
        if (status === 'SUBSCRIBED') {
          subscribed = true
          this.requestCurrentState()
        }
      })

    // Fallback: if channel doesn't subscribe within 3s, fetch state anyway
    setTimeout(() => {
      if (!subscribed && this.currentAuctionId === auctionId) {
        console.log(`Channel subscription timeout — fetching state via REST fallback`)
        this.requestCurrentState()
      }
    }, 3000)
  }

  // Broadcast auction state update (auctioneer only)
  async broadcastAuctionState(state: AuctionState) {
    if (!this.channel) return

    // Broadcast to all connected clients (persistence is handled by the caller)
    await this.channel.send({
      type: 'broadcast',
      event: 'auction-state',
      payload: {
        ...state,
        lastUpdated: new Date().toISOString()
      }
    })
  }

  // Broadcast bid update (captains only)
  async broadcastBid(auctionId: string, teamName: string, bid: FormalBid) {
    if (!this.channel) return

    // Broadcast the bid update
    await this.channel.send({
      type: 'broadcast',
      event: 'bid-update',
      payload: {
        roundId: '',
        teamId: bid.teamId,
        teamName: bid.teamName,
        amount: bid.amount,
      }
    })
  }

  // Clear bids — no-op now, bids are cleared by closing the round
  async clearBids(_auctionId: string) {
    await this.channel?.send({
      type: 'broadcast',
      event: 'auction-bids',
      payload: { bids: {} }
    })
  }

  // Refresh state from server
  async refreshState() {
    return this.requestCurrentState()
  }

  // Fetch current state from formal model (browser Supabase client)
  // Falls back to REST API if RLS blocks the direct queries
  private async requestCurrentState() {
    if (!this.currentAuctionId) return

    try {
      const state = await this.fetchStateFromSupabase(this.currentAuctionId)
      if (state) {
        this.onStateChangeCallbacks.forEach(callback => callback(state))
        return
      }
    } catch (error) {
      console.warn('Supabase direct query failed, trying REST API fallback:', error)
    }

    // Fallback: fetch via REST API (server-side, bypasses RLS)
    try {
      const state = await this.fetchStateFromApi(this.currentAuctionId)
      if (state) {
        this.onStateChangeCallbacks.forEach(callback => callback(state))
      }
    } catch (error) {
      console.error('Failed to get current state from both sources:', error)
    }
  }

  private async fetchStateFromSupabase(auctionId: string): Promise<AuctionState | null> {
    const { data: auction, error: auctionError } = await this.supabase
      .from('auctions')
      .select('id, name, status, budget_per_team, queue_state')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError) throw auctionError
    if (!auction) return null

    const queueState = auction.queue_state as {
      auctionQueue?: string[]
      auctionIndex?: number
      auctionStarted?: boolean
      unsoldPlayers?: string[]
      deferredPlayers?: string[]
      auctionHistory?: Array<{ player: string; team: string; price: number; action: string }>
    } | null

    const { data: teams } = await this.supabase
      .from('teams')
      .select('id, name')
      .eq('auction_id', auctionId)
      .order('name')

    const { data: teamBudgets } = await this.supabase
      .from('team_budgets')
      .select('team_id, total_budget, spent, budget_remaining')
      .eq('auction_id', auctionId)

    const budgetMap = new Map(
      (teamBudgets || []).map(b => [b.team_id, b])
    )

    const { data: results } = await this.supabase
      .from('auction_results')
      .select('player_id, team_id, winning_bid_amount, player:players(name), team:teams(name)')
      .eq('auction_id', auctionId)

    const teamPlayersMap = new Map<string, Array<{ id: string; name: string; price: number }>>()
    const soldPlayers: SoldPlayer[] = []

    for (const r of results || []) {
      const teamPlayers = teamPlayersMap.get(r.team_id) || []
      const playerName = (r.player as any)?.name || 'Unknown'
      teamPlayers.push({ id: r.player_id, name: playerName, price: r.winning_bid_amount })
      teamPlayersMap.set(r.team_id, teamPlayers)

      soldPlayers.push({
        playerId: r.player_id,
        playerName,
        teamId: r.team_id,
        teamName: (r.team as any)?.name || 'Unknown',
        price: r.winning_bid_amount,
      })
    }

    const teamStates: TeamState[] = (teams || []).map(t => {
      const budget = budgetMap.get(t.id)
      return {
        id: t.id,
        name: t.name,
        coins: budget?.budget_remaining ?? auction.budget_per_team,
        originalCoins: budget?.total_budget ?? auction.budget_per_team,
        players: teamPlayersMap.get(t.id) || [],
      }
    })

    return {
      id: auction.id,
      name: auction.name,
      status: auction.status,
      teams: teamStates,
      currentRound: null,
      soldPlayers,
      unsoldPlayers: queueState?.unsoldPlayers || [],
      deferredPlayers: queueState?.deferredPlayers || [],
      auctionHistory: queueState?.auctionHistory || [],
      auctionQueue: queueState?.auctionQueue || [],
      auctionIndex: queueState?.auctionIndex ?? 0,
      auctionStarted: queueState?.auctionStarted ?? false,
      lastUpdated: new Date().toISOString(),
    }
  }

  private async fetchStateFromApi(auctionId: string): Promise<AuctionState | null> {
    const res = await fetch(`/api/auctions/${auctionId}`)
    if (!res.ok) return null
    const data = await res.json()

    // Build sold players from players with SOLD status
    const soldPlayers: SoldPlayer[] = (data.players || [])
      .filter((p: any) => p.status === 'SOLD' && p.assignedTeam)
      .map((p: any) => {
        const team = (data.teams || []).find((t: any) => t.id === p.assignedTeam?.id)
        const result = (team?.players || []).find((tp: any) => tp.id === p.id)
        return {
          playerId: p.id,
          playerName: p.name,
          teamId: p.assignedTeam.id,
          teamName: p.assignedTeam.name,
          price: result?.price || 0,
        }
      })

    return {
      id: data.id || auctionId,
      name: data.name || '',
      status: data.status || 'DRAFT',
      teams: (data.teams || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        coins: t.budgetRemaining ?? data.budgetPerTeam ?? 0,
        originalCoins: data.budgetPerTeam ?? 0,
        players: (t.players || []).map((p: any) => ({
          id: p.id || '',
          name: p.name || 'Unknown',
          price: p.price || 0,
        })),
      })),
      currentRound: null,
      soldPlayers,
      unsoldPlayers: data.queueState?.unsoldPlayers || [],
      deferredPlayers: data.queueState?.deferredPlayers || [],
      auctionHistory: data.queueState?.auctionHistory || [],
      auctionQueue: data.queueState?.auctionQueue || [],
      auctionIndex: data.queueState?.auctionIndex ?? 0,
      auctionStarted: data.queueState?.auctionStarted ?? false,
      lastUpdated: new Date().toISOString(),
    }
  }

  // Save queue state (queue order, index, started flag + ephemeral state) to auctions table
  private async saveQueueState(state: AuctionState) {
    await this.supabase
      .from('auctions')
      .update({
        queue_state: {
          auctionQueue: state.auctionQueue,
          auctionIndex: state.auctionIndex,
          auctionStarted: state.auctionStarted,
          unsoldPlayers: state.unsoldPlayers,
          deferredPlayers: state.deferredPlayers,
          auctionHistory: state.auctionHistory,
        }
      })
      .eq('id', state.id)
  }

  // Register callbacks
  onAuctionStateChange(callback: (state: AuctionState) => void) {
    this.onStateChangeCallbacks.push(callback)
  }

  onBidsChange(callback: (bids: Record<string, FormalBid>) => void) {
    this.onBidsChangeCallbacks.push(callback)
  }

  onBidUpdate(callback: (payload: { roundId: string; teamId: string; teamName: string; amount: number }) => void) {
    this.onBidUpdateCallbacks.push(callback)
  }

  // Cleanup
  unsubscribe() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.currentAuctionId = null
    this.onStateChangeCallbacks = []
    this.onBidsChangeCallbacks = []
    this.onBidUpdateCallbacks = []
  }
}

export const auctionRealtimeManager = new AuctionRealtimeManager()
