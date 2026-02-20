import { createClient } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface Team {
  name: string
  coins: number
  originalCoins: number
  players: Array<{ name: string; price: number; tier?: number }>
}

export interface AuctionState {
  id: string
  name: string
  teams: Team[]
  auctionQueue: string[]
  auctionIndex: number
  auctionStarted: boolean
  soldPlayers: { [playerName: string]: { team: string; price: number } }
  unsoldPlayers: string[]
  deferredPlayers: string[]
  auctionHistory: Array<{ player: string; team: string; price: number; action?: string }>
  lastUpdated: string
}

export interface PlayerBid {
  teamName: string
  playerName: string
  amount: number
  timestamp: number
}

class AuctionRealtimeManager {
  private supabase = createClient()
  private channel: RealtimeChannel | null = null
  private currentAuctionId: string | null = null
  private onStateChangeCallbacks: ((state: AuctionState) => void)[] = []
  private onBidsChangeCallbacks: ((bids: Record<string, PlayerBid>) => void)[] = []

  // Subscribe to auction state changes
  subscribeToAuction(auctionId: string) {
    if (this.channel && this.currentAuctionId === auctionId) {
      return // Already subscribed to this auction
    }

    this.unsubscribe()
    this.currentAuctionId = auctionId

    this.channel = this.supabase.channel(`auction-${auctionId}`)

    // Listen for auction state broadcasts
    ;(this.channel as any)
      .on('broadcast', { event: 'auction-state' }, (payload: { state: AuctionState }) => {
        this.onStateChangeCallbacks.forEach(callback => callback(payload.state))
      })
      .on('broadcast', { event: 'auction-bids' }, (payload: { bids: Record<string, PlayerBid> }) => {
        this.onBidsChangeCallbacks.forEach(callback => callback(payload.bids))
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to auction-${auctionId}`)
          // Request current state when we join
          this.requestCurrentState()
        }
      })
  }

  // Broadcast auction state update (auctioneer only)
  async broadcastAuctionState(state: AuctionState) {
    if (!this.channel) return

    // Save to Supabase table for persistence
    await this.saveAuctionState(state)

    // Broadcast to all connected clients
    await this.channel.send({
      type: 'broadcast',
      event: 'auction-state',
      state: {
        ...state,
        lastUpdated: new Date().toISOString()
      }
    })
  }

  // Broadcast bid update (captains only)
  async broadcastBid(auctionId: string, teamName: string, bid: PlayerBid) {
    if (!this.channel) return

    // Save bid to Supabase
    await this.saveBid(auctionId, teamName, bid)

    // Get all current bids and broadcast
    const allBids = await this.getCurrentBids(auctionId)
    await this.channel.send({
      type: 'broadcast',
      event: 'auction-bids',
      bids: allBids
    })
  }

  // Clear all bids (auctioneer only)
  async clearBids(auctionId: string) {
    // Delete from Supabase
    await this.supabase
      .from('auction_bids')
      .delete()
      .eq('auction_id', auctionId)

    // Broadcast empty bids
    await this.channel?.send({
      type: 'broadcast',
      event: 'auction-bids',
      bids: {}
    })
  }

  // Request current state from server
  private async requestCurrentState() {
    if (!this.currentAuctionId) return

    try {
      // Get auction state from Supabase
      const { data: auctionData } = await this.supabase
        .from('live_auctions')
        .select('*')
        .eq('id', this.currentAuctionId)
        .single()

      if (auctionData) {
        const state: AuctionState = JSON.parse(auctionData.state)
        this.onStateChangeCallbacks.forEach(callback => callback(state))
      }

      // Get current bids
      const bids = await this.getCurrentBids(this.currentAuctionId)
      this.onBidsChangeCallbacks.forEach(callback => callback(bids))
    } catch (error) {
      console.error('Failed to get current state:', error)
    }
  }

  // Save auction state to Supabase
  private async saveAuctionState(state: AuctionState) {
    await this.supabase
      .from('live_auctions')
      .upsert({
        id: state.id,
        name: state.name,
        state: JSON.stringify(state),
        last_updated: new Date().toISOString()
      })
  }

  // Save bid to Supabase
  private async saveBid(auctionId: string, teamName: string, bid: PlayerBid) {
    await this.supabase
      .from('auction_bids')
      .upsert({
        auction_id: auctionId,
        team_name: teamName,
        player_name: bid.playerName,
        amount: bid.amount,
        timestamp: new Date(bid.timestamp).toISOString()
      })
  }

  // Get current bids from Supabase
  private async getCurrentBids(auctionId: string): Promise<Record<string, PlayerBid>> {
    const { data } = await this.supabase
      .from('auction_bids')
      .select('*')
      .eq('auction_id', auctionId)

    const bids: Record<string, PlayerBid> = {}
    if (data) {
      data.forEach(row => {
        bids[row.team_name] = {
          teamName: row.team_name,
          playerName: row.player_name,
          amount: row.amount,
          timestamp: new Date(row.timestamp).getTime()
        }
      })
    }
    return bids
  }

  // Register callbacks
  onAuctionStateChange(callback: (state: AuctionState) => void) {
    this.onStateChangeCallbacks.push(callback)
  }

  onBidsChange(callback: (bids: Record<string, PlayerBid>) => void) {
    this.onBidsChangeCallbacks.push(callback)
  }

  // Cleanup
  unsubscribe() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.currentAuctionId = null
  }
}

export const auctionRealtimeManager = new AuctionRealtimeManager()