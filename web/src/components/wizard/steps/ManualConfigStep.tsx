'use client'

import { WizardStep } from '@/components/wizard/WizardStep'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuctionConfigFormData } from '@/lib/validations/auction'
import { Settings, DollarSign, Users, Trophy } from 'lucide-react'

interface ManualConfigStepProps {
  data?: Partial<AuctionConfigFormData>
  onChange: (data: Partial<AuctionConfigFormData>) => void
  errors?: Record<string, string[]>
}

export function ManualConfigStep({ data = {}, onChange, errors = {} }: ManualConfigStepProps) {
  const handleInputChange = (field: keyof AuctionConfigFormData, value: string | number) => {
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
              <DollarSign className="h-5 w-5 text-success" />
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
                  className={getFieldError('budgetPerTeam') ? 'border-destructive' : ''}
                />
                {getFieldError('budgetPerTeam') && (
                  <p className="text-sm text-destructive">{getFieldError('budgetPerTeam')}</p>
                )}
                <p className="text-xs text-muted-foreground">
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
                  className={getFieldError('currencyName') ? 'border-destructive' : ''}
                />
                {getFieldError('currencyName') && (
                  <p className="text-sm text-destructive">{getFieldError('currencyName')}</p>
                )}
                <p className="text-xs text-muted-foreground">
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
                className={`text-center ${getFieldError('currencyIcon') ? 'border-destructive' : ''}`}
              />
              {getFieldError('currencyIcon') && (
                <p className="text-sm text-destructive">{getFieldError('currencyIcon')}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Emoji or symbol for currency
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Team & Squad Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
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
                  className={getFieldError('numTeams') ? 'border-destructive' : ''}
                />
                {getFieldError('numTeams') && (
                  <p className="text-sm text-destructive">{getFieldError('numTeams')}</p>
                )}
                <p className="text-xs text-muted-foreground">
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
                  className={getFieldError('squadSize') ? 'border-destructive' : ''}
                />
                {getFieldError('squadSize') && (
                  <p className="text-sm text-destructive">{getFieldError('squadSize')}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Players each team must acquire (5-18)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Analysis */}
        {data.budgetPerTeam && data.squadSize && (
          <Card className="bg-muted">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle>Budget Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{data.budgetPerTeam}</div>
                  <div className="text-sm text-primary">Total Budget</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{data.squadSize}</div>
                  <div className="text-sm text-primary">Squad Size</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {Math.floor(data.budgetPerTeam / data.squadSize)}
                  </div>
                  <div className="text-sm text-primary">Avg per Player</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {data.numTeams ? data.budgetPerTeam * data.numTeams : '?'}
                  </div>
                  <div className="text-sm text-primary">Total Pool</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Configuration Tips */}
        <Card className="border-info/30 bg-info/10">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle className="text-info-foreground">Configuration Tips</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-info-foreground space-y-2">
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
