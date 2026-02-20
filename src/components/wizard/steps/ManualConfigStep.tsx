'use client'

import { WizardStep } from '@/components/wizard/WizardStep'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AuctionConfigFormData } from '@/lib/validations/auction'
import { Settings, DollarSign, Users, Trophy, Eye, Shield, MessageSquare, Clock, Zap, UserX } from 'lucide-react'

interface ManualConfigStepProps {
  data?: Partial<AuctionConfigFormData>
  onChange: (data: Partial<AuctionConfigFormData>) => void
  errors?: Record<string, string[]>
}

export function ManualConfigStep({ data = {}, onChange, errors = {} }: ManualConfigStepProps) {
  const handleInputChange = (field: keyof AuctionConfigFormData, value: string | number | boolean) => {
    onChange({
      ...data,
      [field]: value
    })
  }

  const getFieldError = (field: string) => {
    return errors[field]?.[0]
  }

  return (
    <WizardStep
      title="Manual Configuration"
      description="Customize all auction settings manually"
      errors={errors}
    >
      <div className="space-y-6">
        {/* Budget Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle>Budget Settings</CardTitle>
            </div>
            <CardDescription>
              Configure the budget and currency for your auction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetPerTeam">Budget per Team</Label>
                <Input
                  id="budgetPerTeam"
                  type="number"
                  min="100"
                  max="10000"
                  placeholder="1000"
                  value={data.budgetPerTeam || ''}
                  onChange={(e) => handleInputChange('budgetPerTeam', parseInt(e.target.value) || 0)}
                  className={getFieldError('budgetPerTeam') ? 'border-red-500' : ''}
                />
                {getFieldError('budgetPerTeam') && (
                  <p className="text-sm text-red-600">{getFieldError('budgetPerTeam')}</p>
                )}
                <p className="text-xs text-gray-500">
                  Total budget each team has for bidding (100-10,000)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencyName">Currency Name</Label>
                <Input
                  id="currencyName"
                  placeholder="Coins"
                  maxLength={20}
                  value={data.currencyName || ''}
                  onChange={(e) => handleInputChange('currencyName', e.target.value)}
                  className={getFieldError('currencyName') ? 'border-red-500' : ''}
                />
                {getFieldError('currencyName') && (
                  <p className="text-sm text-red-600">{getFieldError('currencyName')}</p>
                )}
                <p className="text-xs text-gray-500">
                  What to call your auction currency
                </p>
              </div>
            </div>

            <div className="w-32">
              <Label htmlFor="currencyIcon">Currency Icon</Label>
              <Input
                id="currencyIcon"
                placeholder="🪙"
                maxLength={4}
                value={data.currencyIcon || ''}
                onChange={(e) => handleInputChange('currencyIcon', e.target.value)}
                className={`text-center ${getFieldError('currencyIcon') ? 'border-red-500' : ''}`}
              />
              {getFieldError('currencyIcon') && (
                <p className="text-sm text-red-600">{getFieldError('currencyIcon')}</p>
              )}
              <p className="text-xs text-gray-500">
                Emoji or symbol for currency
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Team & Squad Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Team & Squad Settings</CardTitle>
            </div>
            <CardDescription>
              Configure team count and squad composition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numTeams">Number of Teams</Label>
                <Input
                  id="numTeams"
                  type="number"
                  min="2"
                  max="12"
                  placeholder="8"
                  value={data.numTeams || ''}
                  onChange={(e) => handleInputChange('numTeams', parseInt(e.target.value) || 0)}
                  className={getFieldError('numTeams') ? 'border-red-500' : ''}
                />
                {getFieldError('numTeams') && (
                  <p className="text-sm text-red-600">{getFieldError('numTeams')}</p>
                )}
                <p className="text-xs text-gray-500">
                  How many teams will participate (2-12)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="squadSize">Squad Size</Label>
                <Input
                  id="squadSize"
                  type="number"
                  min="5"
                  max="18"
                  placeholder="11"
                  value={data.squadSize || ''}
                  onChange={(e) => handleInputChange('squadSize', parseInt(e.target.value) || 0)}
                  className={getFieldError('squadSize') ? 'border-red-500' : ''}
                />
                {getFieldError('squadSize') && (
                  <p className="text-sm text-red-600">{getFieldError('squadSize')}</p>
                )}
                <p className="text-xs text-gray-500">
                  Players each team must acquire (5-18)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Analysis */}
        {data.budgetPerTeam && data.squadSize && (
          <Card className="bg-gray-50">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-purple-600" />
                <CardTitle>Budget Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-purple-700">{data.budgetPerTeam}</div>
                  <div className="text-sm text-purple-600">Total Budget</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">{data.squadSize}</div>
                  <div className="text-sm text-purple-600">Squad Size</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    {Math.floor(data.budgetPerTeam / data.squadSize)}
                  </div>
                  <div className="text-sm text-purple-600">Avg per Player</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">
                    {data.numTeams ? data.budgetPerTeam * data.numTeams : '?'}
                  </div>
                  <div className="text-sm text-purple-600">Total Pool</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transparency & Visibility Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-indigo-600" />
              <CardTitle>Transparency & Visibility</CardTitle>
            </div>
            <CardDescription>
              Configure what information is visible to different participants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tiers Visibility */}
            <div className="space-y-2">
              <Label htmlFor="tiersVisible">Player Tiers Visibility</Label>
              <Select
                value={data.tiersVisible || 'ORGANIZERS_ONLY'}
                onValueChange={(value) => handleInputChange('tiersVisible', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ORGANIZERS_ONLY">
                    <div className="space-y-1">
                      <div className="font-medium">Organizers Only</div>
                      <div className="text-xs text-gray-500">Only auction organizers can see player tiers</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="CAPTAINS_AND_ORGANIZERS">
                    <div className="space-y-1">
                      <div className="font-medium">Captains & Organizers</div>
                      <div className="text-xs text-gray-500">Team captains and organizers can see tiers</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="PUBLIC">
                    <div className="space-y-1">
                      <div className="font-medium">Public</div>
                      <div className="text-xs text-gray-500">Everyone can see player tiers</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {getFieldError('tiersVisible') && (
                <p className="text-sm text-red-600">{getFieldError('tiersVisible')}</p>
              )}
              <p className="text-xs text-gray-500">
                Control who can see the tier classification of players
              </p>
            </div>

            {/* Bid Amounts Visibility */}
            <div className="space-y-2">
              <Label htmlFor="bidAmountsVisible">Bid Amounts Visibility</Label>
              <Select
                value={data.bidAmountsVisible || 'HIDDEN'}
                onValueChange={(value) => handleInputChange('bidAmountsVisible', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bid visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIDDEN">
                    <div className="space-y-1">
                      <div className="font-medium">Hidden (Sealed Bidding)</div>
                      <div className="text-xs text-gray-500">Bid amounts never shown - true sealed auction</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="AFTER_BIDDING">
                    <div className="space-y-1">
                      <div className="font-medium">Revealed After Bidding</div>
                      <div className="text-xs text-gray-500">Show all bids after each player is allocated</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="REAL_TIME">
                    <div className="space-y-1">
                      <div className="font-medium">Real-time Visibility</div>
                      <div className="text-xs text-gray-500">All bids shown live during auction</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {getFieldError('bidAmountsVisible') && (
                <p className="text-sm text-red-600">{getFieldError('bidAmountsVisible')}</p>
              )}
              <p className="text-xs text-gray-500">
                Configure if and when bid amounts are visible to participants
              </p>
            </div>

            {/* Advanced Features */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Advanced Features</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between space-x-3">
                  <div className="space-y-1">
                    <Label htmlFor="showPlayerStats" className="text-sm font-medium">
                      Show Player Stats
                    </Label>
                    <p className="text-xs text-gray-500">
                      Display player statistics during bidding
                    </p>
                  </div>
                  <Switch
                    id="showPlayerStats"
                    checked={data.showPlayerStats ?? true}
                    onCheckedChange={(checked) => handleInputChange('showPlayerStats', checked)}
                  />
                </div>

                <div className="flex items-center justify-between space-x-3">
                  <div className="space-y-1">
                    <Label htmlFor="allowBidComments" className="text-sm font-medium">
                      Allow Bid Comments
                    </Label>
                    <p className="text-xs text-gray-500">
                      Let captains add comments with bids
                    </p>
                  </div>
                  <Switch
                    id="allowBidComments"
                    checked={data.allowBidComments ?? false}
                    onCheckedChange={(checked) => handleInputChange('allowBidComments', checked)}
                  />
                </div>

                <div className="flex items-center justify-between space-x-3">
                  <div className="space-y-1">
                    <Label htmlFor="enableNominations" className="text-sm font-medium">
                      Enable Nominations
                    </Label>
                    <p className="text-xs text-gray-500">
                      Allow captains to nominate players for bidding
                    </p>
                  </div>
                  <Switch
                    id="enableNominations"
                    checked={data.enableNominations ?? false}
                    onCheckedChange={(checked) => handleInputChange('enableNominations', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Transparency Examples */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h5 className="font-medium text-sm">Configuration Examples:</h5>
              <div className="text-xs space-y-2">
                <div>
                  <strong>Pure Sealed Auction:</strong> Tiers organizers only, bids hidden
                </div>
                <div>
                  <strong>Strategic Auction:</strong> Tiers visible to captains, bids revealed after
                </div>
                <div>
                  <strong>Transparent Auction:</strong> Everything public, real-time bid visibility
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bidding Time Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <CardTitle>Bidding Time Management</CardTitle>
            </div>
            <CardDescription>
              Configure time limits and extensions for bidding rounds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="biddingTimeLimit">
                  Bidding Time Limit (seconds)
                </Label>
                <Input
                  id="biddingTimeLimit"
                  type="number"
                  value={data.biddingTimeLimit ?? 120}
                  onChange={(e) => handleInputChange('biddingTimeLimit', parseInt(e.target.value))}
                  placeholder="120"
                  min="30"
                  max="600"
                />
                {getFieldError('biddingTimeLimit') && (
                  <p className="text-sm text-red-600">{getFieldError('biddingTimeLimit')}</p>
                )}
                <p className="text-xs text-gray-500">
                  Time allowed for each player bidding round (30-600 seconds)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extendedTimeSeconds">
                  Extended Time (seconds)
                </Label>
                <Input
                  id="extendedTimeSeconds"
                  type="number"
                  value={data.extendedTimeSeconds ?? 30}
                  onChange={(e) => handleInputChange('extendedTimeSeconds', parseInt(e.target.value))}
                  placeholder="30"
                  min="10"
                  max="120"
                  disabled={!data.enableExtendedTime}
                />
                {getFieldError('extendedTimeSeconds') && (
                  <p className="text-sm text-red-600">{getFieldError('extendedTimeSeconds')}</p>
                )}
                <p className="text-xs text-gray-500">
                  Additional time when new bids come in late
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between space-x-3">
              <div className="space-y-1">
                <Label htmlFor="enableExtendedTime" className="text-sm font-medium">
                  Enable Extended Time
                </Label>
                <p className="text-xs text-gray-500">
                  Automatically extend time when bids come in during final seconds
                </p>
              </div>
              <Switch
                id="enableExtendedTime"
                checked={data.enableExtendedTime ?? true}
                onCheckedChange={(checked) => handleInputChange('enableExtendedTime', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-bid System */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <CardTitle>Auto-bid System</CardTitle>
            </div>
            <CardDescription>
              Allow teams to set up automatic bidding with predefined limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-3">
              <div className="space-y-1">
                <Label htmlFor="allowAutoBidding" className="text-sm font-medium">
                  Allow Auto-bidding
                </Label>
                <p className="text-xs text-gray-500">
                  Enable teams to set automatic bidding rules up to their limits
                </p>
              </div>
              <Switch
                id="allowAutoBidding"
                checked={data.allowAutoBidding ?? false}
                onCheckedChange={(checked) => handleInputChange('allowAutoBidding', checked)}
              />
            </div>

            {data.allowAutoBidding && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="autoBidIncrement">
                    Auto-bid Increment
                  </Label>
                  <Input
                    id="autoBidIncrement"
                    type="number"
                    value={data.autoBidIncrement ?? 5}
                    onChange={(e) => handleInputChange('autoBidIncrement', parseInt(e.target.value))}
                    placeholder="5"
                    min="1"
                    max="100"
                  />
                  {getFieldError('autoBidIncrement') && (
                    <p className="text-sm text-red-600">{getFieldError('autoBidIncrement')}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Amount to increment for each auto-bid
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAutoBidRounds">
                    Max Auto-bid Rounds
                  </Label>
                  <Input
                    id="maxAutoBidRounds"
                    type="number"
                    value={data.maxAutoBidRounds ?? 3}
                    onChange={(e) => handleInputChange('maxAutoBidRounds', parseInt(e.target.value))}
                    placeholder="3"
                    min="1"
                    max="10"
                  />
                  {getFieldError('maxAutoBidRounds') && (
                    <p className="text-sm text-red-600">{getFieldError('maxAutoBidRounds')}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Maximum automatic bidding rounds per player
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player Sale Policy */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-red-600" />
              <CardTitle>Player Sale Policy</CardTitle>
            </div>
            <CardDescription>
              Configure how unsold players and mandatory bidding are handled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-3">
                <div className="space-y-1">
                  <Label htmlFor="allowUnsoldPlayers" className="text-sm font-medium">
                    Allow Unsold Players
                  </Label>
                  <p className="text-xs text-gray-500">
                    Players can go unsold if no team bids on them
                  </p>
                </div>
                <Switch
                  id="allowUnsoldPlayers"
                  checked={data.allowUnsoldPlayers ?? true}
                  onCheckedChange={(checked) => handleInputChange('allowUnsoldPlayers', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-3">
                <div className="space-y-1">
                  <Label htmlFor="mandatoryBidding" className="text-sm font-medium">
                    Mandatory Bidding
                  </Label>
                  <p className="text-xs text-gray-500">
                    At least one team must bid on every player
                  </p>
                </div>
                <Switch
                  id="mandatoryBidding"
                  checked={data.mandatoryBidding ?? false}
                  onCheckedChange={(checked) => handleInputChange('mandatoryBidding', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-3">
                <div className="space-y-1">
                  <Label htmlFor="minimumBidRequired" className="text-sm font-medium">
                    Minimum Bid Required
                  </Label>
                  <p className="text-xs text-gray-500">
                    Players must receive at least their base price to be sold
                  </p>
                </div>
                <Switch
                  id="minimumBidRequired"
                  checked={data.minimumBidRequired ?? true}
                  onCheckedChange={(checked) => handleInputChange('minimumBidRequired', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unsoldPlayerAction">
                  Unsold Player Action
                </Label>
                <Select
                  value={data.unsoldPlayerAction ?? 'BACKLOG'}
                  onValueChange={(value: 'REMOVE' | 'BACKLOG' | 'REDUCE_PRICE') =>
                    handleInputChange('unsoldPlayerAction', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose action for unsold players" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REMOVE">Remove from Auction</SelectItem>
                    <SelectItem value="BACKLOG">Move to Backlog (try again later)</SelectItem>
                    <SelectItem value="REDUCE_PRICE">Reduce Base Price & Retry</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  What happens when a player goes unsold
                </p>
              </div>
            </div>

            {/* Policy Examples */}
            <div className="bg-red-50 rounded-lg p-4 space-y-3">
              <h5 className="font-medium text-sm">Policy Examples:</h5>
              <div className="text-xs space-y-2">
                <div>
                  <strong>Guaranteed Sale:</strong> Mandatory bidding ON, unsold action: Reduce Price
                </div>
                <div>
                  <strong>Market-driven:</strong> Allow unsold ON, minimum bid OFF, action: Remove
                </div>
                <div>
                  <strong>Second Chance:</strong> Allow unsold ON, action: Backlog for later rounds
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Squad Balance */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <CardTitle>Team Squad Balance</CardTitle>
            </div>
            <CardDescription>
              Control how evenly players are distributed across teams to maintain competitive balance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-3">
              <div className="space-y-1">
                <Label htmlFor="enforceSquadBalance" className="text-sm font-medium">
                  Enforce Squad Balance
                </Label>
                <p className="text-xs text-gray-500">
                  Prevent teams from having too many more players than others
                </p>
              </div>
              <Switch
                id="enforceSquadBalance"
                checked={data.enforceSquadBalance ?? false}
                onCheckedChange={(checked) => handleInputChange('enforceSquadBalance', checked)}
              />
            </div>

            {(data.enforceSquadBalance ?? false) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxSquadImbalance">Maximum Squad Imbalance</Label>
                    <Input
                      id="maxSquadImbalance"
                      type="number"
                      min={1}
                      max={5}
                      value={data.maxSquadImbalance ?? 2}
                      onChange={(e) => handleInputChange('maxSquadImbalance', parseInt(e.target.value) || 2)}
                    />
                    <p className="text-xs text-gray-500">
                      Max difference in player count between teams (1-5 players)
                    </p>
                  </div>

                  <div className="space-y-3 mt-6">
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={data.allowFlexibleSquadSizes ?? true}
                        onCheckedChange={(checked) => handleInputChange('allowFlexibleSquadSizes', checked)}
                      />
                      <div>
                        <Label className="text-sm font-medium">Allow Flexible Squad Sizes</Label>
                        <p className="text-xs text-gray-500">
                          Teams can end up with different final squad sizes within the imbalance limit
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Examples */}
                <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                  <h5 className="font-medium text-sm">Balance Examples:</h5>
                  <div className="text-xs space-y-2">
                    <div>
                      <strong>Strict Balance:</strong> Max imbalance: 1, Flexible sizes: OFF
                    </div>
                    <div>
                      <strong>Moderate Balance:</strong> Max imbalance: 2, Flexible sizes: ON
                    </div>
                    <div>
                      <strong>Flexible Distribution:</strong> Max imbalance: 3-5, depends on squad strategy
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Configuration Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-800">Configuration Tips</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Budget per Team:</strong> Higher budgets allow for more strategic bidding but may extend auction time
              </li>
              <li>
                <strong>Squad Size:</strong> Larger squads mean more depth but require more players and time to draft
              </li>
              <li>
                <strong>Team Count:</strong> More teams create competition but require more players and captains
              </li>
              <li>
                <strong>Currency:</strong> Choose names and icons that match your league's theme and culture
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </WizardStep>
  )
}