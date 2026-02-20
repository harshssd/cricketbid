'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Settings,
  Eye,
  Users,
  Crown,
  Download,
  Upload,
  RotateCcw,
  Palette,
  Save
} from 'lucide-react'
import { viewConfigManager } from '@/lib/view-config-manager'
import { ViewConfigOptions } from '@/types/view-config'

interface ViewConfigDialogProps {
  auctionId: string
  trigger?: React.ReactNode
}

interface ConfigSectionProps {
  title: string
  icon: React.ReactNode
  description: string
  config: ViewConfigOptions
  onConfigChange: (updates: Partial<ViewConfigOptions>) => void
}

const ConfigSection = ({ title, icon, description, config, onConfigChange }: ConfigSectionProps) => {
  const sections = [
    {
      title: 'Team Information',
      options: [
        { key: 'showTeamBudgets', label: 'Team Budgets', description: 'Show each team\'s total budget' },
        { key: 'showTeamRemainingCoins', label: 'Remaining Coins', description: 'Display coins left for each team' },
        { key: 'showTeamSquadSize', label: 'Squad Size', description: 'Show player count for each team' },
        { key: 'showTeamSpending', label: 'Total Spending', description: 'Display amount spent by each team' },
        { key: 'showTeamPlayers', label: 'Team Players', description: 'List of players in each team' },
        { key: 'showTeamPlayerDetails', label: 'Player Details', description: 'Detailed info about each player' },
      ]
    },
    {
      title: 'Player Information',
      options: [
        { key: 'showCurrentPlayer', label: 'Current Player', description: 'Show player being auctioned' },
        { key: 'showPlayerTier', label: 'Player Tier', description: 'Display player tier/category' },
        { key: 'showPlayerBasePrice', label: 'Base Price', description: 'Show minimum bid amount' },
        { key: 'showPlayerNotes', label: 'Player Notes', description: 'Additional player information' },
      ]
    },
    {
      title: 'Auction Progress',
      options: [
        { key: 'showAuctionProgress', label: 'Progress Info', description: 'General auction progress' },
        { key: 'showProgressBar', label: 'Progress Bar', description: 'Visual progress indicator' },
        { key: 'showSoldCount', label: 'Sold Count', description: 'Number of players sold' },
        { key: 'showRemainingCount', label: 'Remaining Count', description: 'Players left to auction' },
        { key: 'showDeferredCount', label: 'Deferred Count', description: 'Players deferred for later' },
        { key: 'showTotalSpent', label: 'Total Spent', description: 'Total money spent across all teams' },
      ]
    },
    {
      title: 'Bidding & History',
      options: [
        { key: 'showCurrentBids', label: 'Current Bids', description: 'Active bids for current player' },
        { key: 'showBidHistory', label: 'Bid History', description: 'History of all bids placed' },
        { key: 'showHighestBid', label: 'Highest Bid', description: 'Show current highest bid' },
        { key: 'showBidTimer', label: 'Bid Timer', description: 'Countdown timer for bids' },
        { key: 'showRecentSales', label: 'Recent Sales', description: 'Recently sold players' },
        { key: 'showSalesDetails', label: 'Sales Details', description: 'Detailed sale information' },
        { key: 'showFullAuctionHistory', label: 'Full History', description: 'Complete auction history' },
      ]
    },
    {
      title: 'Interface Elements',
      options: [
        { key: 'showLastUpdated', label: 'Last Updated', description: 'Show last update timestamp' },
        { key: 'showLiveStatus', label: 'Live Status', description: 'Live auction indicator' },
        { key: 'showConnectionStatus', label: 'Connection Status', description: 'Real-time connection status' },
      ]
    },
    {
      title: 'Control Features',
      options: [
        { key: 'showAuctionControls', label: 'Auction Controls', description: 'Player navigation controls' },
        { key: 'showBidManagement', label: 'Bid Management', description: 'Bid acceptance/rejection controls' },
        { key: 'showPlayerManagement', label: 'Player Management', description: 'Add/remove player controls' },
        { key: 'showTeamManagement', label: 'Team Management', description: 'Team editing controls' },
      ]
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 pb-4 border-b">
        {icon}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.options.map((option) => (
              <div key={option.key} className="flex items-center space-x-3">
                <Checkbox
                  id={`${title}-${option.key}`}
                  checked={config[option.key as keyof ViewConfigOptions]}
                  onCheckedChange={(checked) => {
                    onConfigChange({ [option.key]: checked })
                  }}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`${title}-${option.key}`}
                    className="font-medium cursor-pointer"
                  >
                    {option.label}
                  </Label>
                  <p className="text-xs text-gray-600">{option.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function ViewConfigDialog({ auctionId, trigger }: ViewConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [auctioneerConfig, setAuctioneerConfig] = useState<ViewConfigOptions>()
  const [captainConfig, setCaptainConfig] = useState<ViewConfigOptions>()
  const [publicConfig, setPublicConfig] = useState<ViewConfigOptions>()
  const [exportText, setExportText] = useState('')
  const [importText, setImportText] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadConfigs()
    }
  }, [isOpen, auctionId])

  const loadConfigs = () => {
    setAuctioneerConfig(viewConfigManager.getAuctioneerConfig(auctionId))
    setCaptainConfig(viewConfigManager.getCaptainConfig(auctionId))
    setPublicConfig(viewConfigManager.getPublicConfig(auctionId))
  }

  const handleSave = () => {
    if (auctioneerConfig) viewConfigManager.updateAuctioneerConfig(auctionId, auctioneerConfig)
    if (captainConfig) viewConfigManager.updateCaptainConfig(auctionId, captainConfig)
    if (publicConfig) viewConfigManager.updatePublicConfig(auctionId, publicConfig)

    // Reload the page to apply changes
    window.location.reload()
  }

  const handleExport = () => {
    const configJson = viewConfigManager.exportConfig(auctionId)
    setExportText(configJson)
  }

  const handleImport = () => {
    if (viewConfigManager.importConfig(auctionId, importText)) {
      loadConfigs()
      setImportText('')
    } else {
      alert('Invalid configuration format')
    }
  }

  const handleReset = () => {
    viewConfigManager.resetToDefaults(auctionId)
    loadConfigs()
  }

  const applyPreset = (preset: 'minimal' | 'standard' | 'comprehensive') => {
    viewConfigManager.applyPreset(auctionId, preset)
    loadConfigs()
  }

  if (!auctioneerConfig || !captainConfig || !publicConfig) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            View Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Auction View Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Customize what information is displayed for each type of user in your auction.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Presets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span>Quick Presets</span>
              </CardTitle>
              <CardDescription>
                Apply pre-configured view settings for different auction styles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => applyPreset('minimal')}>
                  Minimal
                </Button>
                <Button variant="outline" onClick={() => applyPreset('standard')}>
                  Standard
                </Button>
                <Button variant="outline" onClick={() => applyPreset('comprehensive')}>
                  Comprehensive
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Tabs */}
          <Tabs defaultValue="auctioneer" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="auctioneer" className="flex items-center space-x-2">
                <Crown className="h-4 w-4" />
                <span>Auctioneer</span>
              </TabsTrigger>
              <TabsTrigger value="captain" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Captains</span>
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Public</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="auctioneer" className="mt-6">
              <ConfigSection
                title="Auctioneer View"
                icon={<Crown className="h-5 w-5 text-yellow-600" />}
                description="Full control interface with all auction management features"
                config={auctioneerConfig}
                onConfigChange={(updates) => setAuctioneerConfig({ ...auctioneerConfig, ...updates })}
              />
            </TabsContent>

            <TabsContent value="captain" className="mt-6">
              <ConfigSection
                title="Captain View"
                icon={<Users className="h-5 w-5 text-blue-600" />}
                description="Team captain interface focused on bidding and team management"
                config={captainConfig}
                onConfigChange={(updates) => setCaptainConfig({ ...captainConfig, ...updates })}
              />
            </TabsContent>

            <TabsContent value="public" className="mt-6">
              <ConfigSection
                title="Public/Spectator View"
                icon={<Eye className="h-5 w-5 text-green-600" />}
                description="Entertainment-focused view for audience and spectators"
                config={publicConfig}
                onConfigChange={(updates) => setPublicConfig({ ...publicConfig, ...updates })}
              />
            </TabsContent>
          </Tabs>

          {/* Import/Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Import/Export</span>
              </CardTitle>
              <CardDescription>
                Save your configuration or load from another auction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Button onClick={handleExport} variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Config
                  </Button>
                  {exportText && (
                    <Textarea
                      className="mt-2"
                      rows={4}
                      value={exportText}
                      readOnly
                      placeholder="Exported configuration will appear here..."
                    />
                  )}
                </div>
                <div>
                  <Textarea
                    rows={4}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste configuration JSON here to import..."
                  />
                  <Button
                    onClick={handleImport}
                    variant="outline"
                    className="w-full mt-2"
                    disabled={!importText.trim()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Config
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}