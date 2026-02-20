export interface ViewConfigOptions {
  // Team Information
  showTeamBudgets: boolean
  showTeamRemainingCoins: boolean
  showTeamSquadSize: boolean
  showTeamSpending: boolean
  showTeamPlayers: boolean
  showTeamPlayerDetails: boolean

  // Player Information
  showCurrentPlayer: boolean
  showPlayerTier: boolean
  showPlayerBasePrice: boolean
  showPlayerNotes: boolean

  // Auction Progress
  showAuctionProgress: boolean
  showProgressBar: boolean
  showSoldCount: boolean
  showRemainingCount: boolean
  showDeferredCount: boolean
  showTotalSpent: boolean

  // Bidding Information
  showCurrentBids: boolean
  showBidHistory: boolean
  showHighestBid: boolean
  showBidTimer: boolean

  // Auction History
  showRecentSales: boolean
  showSalesDetails: boolean
  showFullAuctionHistory: boolean

  // Real-time Updates
  showLastUpdated: boolean
  showLiveStatus: boolean
  showConnectionStatus: boolean

  // Controls (Auctioneer only)
  showAuctionControls: boolean
  showBidManagement: boolean
  showPlayerManagement: boolean
  showTeamManagement: boolean
}

export interface AuctionViewConfig {
  auctioneerView: ViewConfigOptions
  captainView: ViewConfigOptions
  publicView: ViewConfigOptions
}

export const DEFAULT_AUCTIONEER_CONFIG: ViewConfigOptions = {
  // Show everything for auctioneer
  showTeamBudgets: true,
  showTeamRemainingCoins: true,
  showTeamSquadSize: true,
  showTeamSpending: true,
  showTeamPlayers: true,
  showTeamPlayerDetails: true,
  showCurrentPlayer: true,
  showPlayerTier: true,
  showPlayerBasePrice: true,
  showPlayerNotes: true,
  showAuctionProgress: true,
  showProgressBar: true,
  showSoldCount: true,
  showRemainingCount: true,
  showDeferredCount: true,
  showTotalSpent: true,
  showCurrentBids: true,
  showBidHistory: true,
  showHighestBid: true,
  showBidTimer: false,
  showRecentSales: true,
  showSalesDetails: true,
  showFullAuctionHistory: true,
  showLastUpdated: true,
  showLiveStatus: true,
  showConnectionStatus: true,
  showAuctionControls: true,
  showBidManagement: true,
  showPlayerManagement: true,
  showTeamManagement: true,
}

export const DEFAULT_CAPTAIN_CONFIG: ViewConfigOptions = {
  // Limited view for captains - focus on their team and current player
  showTeamBudgets: false,
  showTeamRemainingCoins: true, // Only their own
  showTeamSquadSize: true,
  showTeamSpending: true,
  showTeamPlayers: true, // Only their own
  showTeamPlayerDetails: true,
  showCurrentPlayer: true,
  showPlayerTier: true,
  showPlayerBasePrice: true,
  showPlayerNotes: false,
  showAuctionProgress: true,
  showProgressBar: true,
  showSoldCount: true,
  showRemainingCount: true,
  showDeferredCount: false,
  showTotalSpent: false,
  showCurrentBids: false, // Don't show other team bids
  showBidHistory: false,
  showHighestBid: false,
  showBidTimer: true,
  showRecentSales: true,
  showSalesDetails: true,
  showFullAuctionHistory: false,
  showLastUpdated: false,
  showLiveStatus: true,
  showConnectionStatus: false,
  showAuctionControls: false,
  showBidManagement: false,
  showPlayerManagement: false,
  showTeamManagement: false,
}

export const DEFAULT_PUBLIC_CONFIG: ViewConfigOptions = {
  // Entertainment focused view for spectators
  showTeamBudgets: false,
  showTeamRemainingCoins: false,
  showTeamSquadSize: true,
  showTeamSpending: true,
  showTeamPlayers: false,
  showTeamPlayerDetails: false,
  showCurrentPlayer: true,
  showPlayerTier: true,
  showPlayerBasePrice: true,
  showPlayerNotes: true,
  showAuctionProgress: true,
  showProgressBar: true,
  showSoldCount: true,
  showRemainingCount: true,
  showDeferredCount: true,
  showTotalSpent: true,
  showCurrentBids: false,
  showBidHistory: false,
  showHighestBid: false,
  showBidTimer: false,
  showRecentSales: true,
  showSalesDetails: true,
  showFullAuctionHistory: false,
  showLastUpdated: true,
  showLiveStatus: true,
  showConnectionStatus: false,
  showAuctionControls: false,
  showBidManagement: false,
  showPlayerManagement: false,
  showTeamManagement: false,
}

export const DEFAULT_VIEW_CONFIG: AuctionViewConfig = {
  auctioneerView: DEFAULT_AUCTIONEER_CONFIG,
  captainView: DEFAULT_CAPTAIN_CONFIG,
  publicView: DEFAULT_PUBLIC_CONFIG,
}