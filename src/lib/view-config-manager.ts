import { AuctionViewConfig, DEFAULT_VIEW_CONFIG, ViewConfigOptions } from '@/types/view-config'

class ViewConfigManager {
  private static instance: ViewConfigManager
  private configs: Map<string, AuctionViewConfig> = new Map()

  private constructor() {}

  static getInstance(): ViewConfigManager {
    if (!ViewConfigManager.instance) {
      ViewConfigManager.instance = new ViewConfigManager()
    }
    return ViewConfigManager.instance
  }

  // Get view config for a specific auction
  getViewConfig(auctionId: string): AuctionViewConfig {
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      return DEFAULT_VIEW_CONFIG
    }

    const stored = localStorage.getItem(`auction-view-config-${auctionId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all properties exist
        return {
          auctioneerView: { ...DEFAULT_VIEW_CONFIG.auctioneerView, ...parsed.auctioneerView },
          captainView: { ...DEFAULT_VIEW_CONFIG.captainView, ...parsed.captainView },
          publicView: { ...DEFAULT_VIEW_CONFIG.publicView, ...parsed.publicView },
        }
      } catch (error) {
        console.error('Failed to parse view config:', error)
      }
    }
    return DEFAULT_VIEW_CONFIG
  }

  // Save view config for a specific auction
  saveViewConfig(auctionId: string, config: AuctionViewConfig): void {
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem(`auction-view-config-${auctionId}`, JSON.stringify(config))
      this.configs.set(auctionId, config)
    } catch (error) {
      console.error('Failed to save view config:', error)
    }
  }

  // Get specific view type config
  getAuctioneerConfig(auctionId: string): ViewConfigOptions {
    return this.getViewConfig(auctionId).auctioneerView
  }

  getCaptainConfig(auctionId: string): ViewConfigOptions {
    return this.getViewConfig(auctionId).captainView
  }

  getPublicConfig(auctionId: string): ViewConfigOptions {
    return this.getViewConfig(auctionId).publicView
  }

  // Update specific view type config
  updateAuctioneerConfig(auctionId: string, config: Partial<ViewConfigOptions>): void {
    const currentConfig = this.getViewConfig(auctionId)
    const updatedConfig = {
      ...currentConfig,
      auctioneerView: { ...currentConfig.auctioneerView, ...config }
    }
    this.saveViewConfig(auctionId, updatedConfig)
  }

  updateCaptainConfig(auctionId: string, config: Partial<ViewConfigOptions>): void {
    const currentConfig = this.getViewConfig(auctionId)
    const updatedConfig = {
      ...currentConfig,
      captainView: { ...currentConfig.captainView, ...config }
    }
    this.saveViewConfig(auctionId, updatedConfig)
  }

  updatePublicConfig(auctionId: string, config: Partial<ViewConfigOptions>): void {
    const currentConfig = this.getViewConfig(auctionId)
    const updatedConfig = {
      ...currentConfig,
      publicView: { ...currentConfig.publicView, ...config }
    }
    this.saveViewConfig(auctionId, updatedConfig)
  }

  // Reset to defaults
  resetToDefaults(auctionId: string): void {
    this.saveViewConfig(auctionId, DEFAULT_VIEW_CONFIG)
  }

  // Export/Import configurations
  exportConfig(auctionId: string): string {
    const config = this.getViewConfig(auctionId)
    return JSON.stringify(config, null, 2)
  }

  importConfig(auctionId: string, configJson: string): boolean {
    try {
      const config = JSON.parse(configJson) as AuctionViewConfig
      // Validate structure
      if (config.auctioneerView && config.captainView && config.publicView) {
        this.saveViewConfig(auctionId, config)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import config:', error)
      return false
    }
  }

  // Preset configurations
  applyPreset(auctionId: string, preset: 'minimal' | 'standard' | 'comprehensive'): void {
    let config: AuctionViewConfig

    switch (preset) {
      case 'minimal':
        config = {
          auctioneerView: {
            ...DEFAULT_VIEW_CONFIG.auctioneerView,
            showTeamPlayerDetails: false,
            showBidHistory: false,
            showFullAuctionHistory: false,
            showConnectionStatus: false,
          },
          captainView: {
            ...DEFAULT_VIEW_CONFIG.captainView,
            showAuctionProgress: false,
            showRecentSales: false,
          },
          publicView: {
            ...DEFAULT_VIEW_CONFIG.publicView,
            showAuctionProgress: false,
            showTotalSpent: false,
            showDeferredCount: false,
          }
        }
        break

      case 'comprehensive':
        config = {
          auctioneerView: DEFAULT_VIEW_CONFIG.auctioneerView,
          captainView: {
            ...DEFAULT_VIEW_CONFIG.captainView,
            showTeamBudgets: true,
            showDeferredCount: true,
            showCurrentBids: true,
            showConnectionStatus: true,
          },
          publicView: {
            ...DEFAULT_VIEW_CONFIG.publicView,
            showTeamPlayers: true,
            showCurrentBids: true,
            showFullAuctionHistory: true,
          }
        }
        break

      default: // standard
        config = DEFAULT_VIEW_CONFIG
        break
    }

    this.saveViewConfig(auctionId, config)
  }
}

export const viewConfigManager = ViewConfigManager.getInstance()

// Hook for React components
export function useViewConfig(auctionId: string, viewType: 'auctioneer' | 'captain' | 'public') {
  const getConfig = (): ViewConfigOptions => {
    switch (viewType) {
      case 'auctioneer':
        return viewConfigManager.getAuctioneerConfig(auctionId)
      case 'captain':
        return viewConfigManager.getCaptainConfig(auctionId)
      case 'public':
        return viewConfigManager.getPublicConfig(auctionId)
      default:
        return DEFAULT_VIEW_CONFIG.publicView
    }
  }

  const updateConfig = (config: Partial<ViewConfigOptions>) => {
    switch (viewType) {
      case 'auctioneer':
        viewConfigManager.updateAuctioneerConfig(auctionId, config)
        break
      case 'captain':
        viewConfigManager.updateCaptainConfig(auctionId, config)
        break
      case 'public':
        viewConfigManager.updatePublicConfig(auctionId, config)
        break
    }
  }

  return { config: getConfig(), updateConfig }
}