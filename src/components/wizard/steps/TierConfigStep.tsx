'use client'

import { useEffect, useState } from 'react'
import { WizardStep } from '@/components/wizard/WizardStep'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TiersFormData, TierFormData, AuctionConfigFormData } from '@/lib/validations/auction'
import { TierConfig } from '@/lib/types'
import { DEFAULT_TIERS } from '@/lib/config-presets'
import { validateBudgetConstraints } from '@/lib/validations/auction'
import { Layers, DollarSign, Users, Plus, Minus, AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface TierConfigStepProps {
  tiers: TiersFormData
  config?: Partial<AuctionConfigFormData>
  onChange: (tiers: TiersFormData) => void
  onConfigChange?: (config: Partial<AuctionConfigFormData>) => void
  onInitialize: (tiers?: TierConfig[]) => void
  errors?: Record<string, string[]>
}

export function TierConfigStep({ tiers, config, onChange, onConfigChange, onInitialize, errors = {} }: TierConfigStepProps) {
  const [validation, setValidation] = useState<{ isValid: boolean; warnings: string[]; flexibility: number } | null>(null)

  // Initialize tiers if empty
  useEffect(() => {
    if (tiers.length === 0) {
      onInitialize(DEFAULT_TIERS.map((tier, index) => ({ ...tier, sortOrder: index })))
    }
  }, [tiers.length, onInitialize])

  // Validate budget constraints when config or tiers change
  useEffect(() => {
    if (config?.budgetPerTeam && config?.squadSize && tiers.length > 0) {
      const fullConfig = {
        budgetPerTeam: config.budgetPerTeam,
        squadSize: config.squadSize,
        currencyName: config.currencyName || 'Coins',
        currencyIcon: config.currencyIcon || '🪙',
        numTeams: config.numTeams || 8
      }

      try {
        const result = validateBudgetConstraints(fullConfig as any, tiers)
        setValidation(result)
      } catch (error) {
        setValidation(null)
      }
    }
  }, [config, tiers])

  const handleTierChange = (index: number, field: keyof TierFormData, value: string | number) => {
    const updatedTiers = [...tiers]
    let parsedValue: string | number | undefined = value
    if (field === 'basePrice') {
      parsedValue = typeof value === 'string' ? parseInt(value) || 0 : value
    } else if (field === 'minPerTeam' || field === 'maxPerTeam') {
      // Allow clearing optional min/max fields
      parsedValue = value === '' ? undefined : (typeof value === 'string' ? parseInt(value) : value)
    }
    updatedTiers[index] = {
      ...updatedTiers[index],
      [field]: parsedValue,
    }
    onChange(updatedTiers)
  }

  const addTier = () => {
    if (!Array.isArray(tiers) || tiers.length >= 6) return

    const newTier: TierFormData = {
      name: `Tier ${tiers.length + 1}`,
      basePrice: Math.floor((config?.budgetPerTeam || 1000) * 0.1),
      color: '#6B7280',
    }
    onChange([...tiers, newTier])
  }

  const removeTier = (index: number) => {
    if (!Array.isArray(tiers) || tiers.length <= 2) return
    const updatedTiers = tiers.filter((_, i) => i !== index)
    // Reorder remaining tiers
    updatedTiers.forEach((tier, i) => {
      ;(tier as any).sortOrder = i
    })
    onChange(updatedTiers)
  }

  const resetToDefaults = () => {
    onInitialize(DEFAULT_TIERS.map((tier, index) => ({ ...tier, sortOrder: index })))
  }

  const moveTier = (index: number, direction: 'up' | 'down') => {
    if (!Array.isArray(tiers)) return
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === tiers.length - 1)) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updatedTiers = [...tiers]

    // Swap tiers
    const temp = updatedTiers[index]
    updatedTiers[index] = updatedTiers[newIndex]
    updatedTiers[newIndex] = temp

    // Update sort orders
    ;(updatedTiers[index] as any).sortOrder = index
    ;(updatedTiers[newIndex] as any).sortOrder = newIndex

    onChange(updatedTiers)
  }

  const getFieldError = (tierIndex: number, field: string) => {
    return errors[`tiers.${tierIndex}.${field}`]?.[0] || errors[`${tierIndex}.${field}`]?.[0]
  }

  const getTotalMinCost = () => {
    if (!Array.isArray(tiers)) return 0
    return tiers.reduce((sum, tier) => sum + (tier.basePrice * (tier.minPerTeam || 0)), 0)
  }

  const getTotalMinPlayers = () => {
    if (!Array.isArray(tiers)) return 0
    return tiers.reduce((sum, tier) => sum + (tier.minPerTeam || 0), 0)
  }

  if (!Array.isArray(tiers) || tiers.length === 0) {
    return (
      <WizardStep
        title="Tier Configuration"
        description="Set up player tiers and pricing"
        errors={errors}
      >
        <Card>
          <CardContent className="p-8 text-center">
            <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Initializing Tiers...</h3>
            <p className="text-gray-600">
              Setting up default player tiers with balanced pricing.
            </p>
          </CardContent>
        </Card>
      </WizardStep>
    )
  }

  return (
    <WizardStep
      title="Tier Configuration"
      description="Set up player tiers and pricing structure"
      errors={errors}
    >
      <div className="space-y-6">
        {/* Budget Per Team */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center space-x-2 min-w-0">
                <DollarSign className="h-5 w-5 text-green-600 shrink-0" />
                <Label htmlFor="budget-per-team" className="font-semibold whitespace-nowrap">
                  {config?.currencyName || 'Coins'} per Team
                </Label>
              </div>
              <div className="flex items-center space-x-3 flex-1">
                <Input
                  id="budget-per-team"
                  type="number"
                  min="100"
                  max="10000"
                  placeholder="1000"
                  value={config?.budgetPerTeam || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    onConfigChange?.({ ...config, budgetPerTeam: val })
                  }}
                  className="w-32"
                />
                <span className="text-sm text-gray-500">{config?.currencyIcon || '🪙'}</span>
                {config?.budgetPerTeam && (
                  <span className="text-sm text-gray-500">
                    · Min cost: {getTotalMinCost()}/{config.budgetPerTeam}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Layers className="h-4 w-4" />
              <span>{tiers.length} tiers</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addTier}
              disabled={tiers.length >= 6}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Tier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="text-xs"
            >
              Reset Defaults
            </Button>
          </div>
        </div>

        {/* Budget Validation */}
        {validation && config?.budgetPerTeam && (
          <Card className={`border-2 ${validation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                {validation.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <CardTitle className={validation.isValid ? 'text-green-800' : 'text-red-800'}>
                  Budget Validation
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                <div>
                  <div className="text-xl font-bold">{validation.flexibility}%</div>
                  <div className="text-sm text-gray-600">Flexibility</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{getTotalMinCost()}</div>
                  <div className="text-sm text-gray-600">Min Cost</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{getTotalMinPlayers()}</div>
                  <div className="text-sm text-gray-600">Min Players</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{config.squadSize}</div>
                  <div className="text-sm text-gray-600">Squad Size</div>
                </div>
              </div>
              {validation.warnings.length > 0 && (
                <div className="space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <p key={index} className={`text-sm ${validation.isValid ? 'text-green-700' : 'text-red-700'}`}>
                      • {warning}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tiers Configuration */}
        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">
                      {tier.name || `Tier ${index + 1}`}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTier(index, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTier(index, 'down')}
                      disabled={index === tiers.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTier(index)}
                      disabled={tiers.length <= 2}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Tier Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`tier-name-${index}`}>Tier Name</Label>
                    <Input
                      id={`tier-name-${index}`}
                      placeholder={`Tier ${index + 1}`}
                      maxLength={30}
                      value={tier.name || ''}
                      onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                      className={getFieldError(index, 'name') ? 'border-red-500' : ''}
                    />
                    {getFieldError(index, 'name') && (
                      <p className="text-sm text-red-600">{getFieldError(index, 'name')}</p>
                    )}
                  </div>

                  {/* Base Price */}
                  <div className="space-y-2">
                    <Label htmlFor={`base-price-${index}`}>Base Price</Label>
                    <div className="flex items-center space-x-1">
                      <Input
                        id={`base-price-${index}`}
                        type="number"
                        min="1"
                        placeholder="50"
                        value={tier.basePrice || ''}
                        onChange={(e) => handleTierChange(index, 'basePrice', e.target.value)}
                        className={getFieldError(index, 'basePrice') ? 'border-red-500' : ''}
                      />
                      <span className="text-xs text-gray-500">{config?.currencyIcon}</span>
                    </div>
                    {config?.budgetPerTeam && (
                      <p className="text-xs text-gray-500">
                        of {config.budgetPerTeam} {config.currencyName || 'Coins'} per team
                      </p>
                    )}
                    {getFieldError(index, 'basePrice') && (
                      <p className="text-sm text-red-600">{getFieldError(index, 'basePrice')}</p>
                    )}
                  </div>

                  {/* Min Per Team */}
                  <div className="space-y-2">
                    <Label htmlFor={`min-per-team-${index}`}>Min/Team <span className="text-gray-400 font-normal">(Optional)</span></Label>
                    <Input
                      id={`min-per-team-${index}`}
                      type="number"
                      min="0"
                      max="18"
                      placeholder="No min"
                      value={tier.minPerTeam ?? ''}
                      onChange={(e) => handleTierChange(index, 'minPerTeam', e.target.value)}
                      className={getFieldError(index, 'minPerTeam') ? 'border-red-500' : ''}
                    />
                    {getFieldError(index, 'minPerTeam') && (
                      <p className="text-sm text-red-600">{getFieldError(index, 'minPerTeam')}</p>
                    )}
                  </div>

                  {/* Max Per Team */}
                  <div className="space-y-2">
                    <Label htmlFor={`max-per-team-${index}`}>Max/Team <span className="text-gray-400 font-normal">(Optional)</span></Label>
                    <Input
                      id={`max-per-team-${index}`}
                      type="number"
                      min="0"
                      max="18"
                      placeholder="No max"
                      value={tier.maxPerTeam ?? ''}
                      onChange={(e) => handleTierChange(index, 'maxPerTeam', e.target.value)}
                      className={getFieldError(index, 'maxPerTeam') ? 'border-red-500' : ''}
                    />
                    {getFieldError(index, 'maxPerTeam') && (
                      <p className="text-sm text-red-600">{getFieldError(index, 'maxPerTeam')}</p>
                    )}
                  </div>
                </div>

                {/* Tier Stats */}
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="font-medium">{tier.basePrice || 0}</div>
                      <div className="text-gray-600">Base Price</div>
                    </div>
                    <div>
                      <div className="font-medium">{tier.minPerTeam != null ? (tier.minPerTeam * (tier.basePrice || 0)) : '—'}</div>
                      <div className="text-gray-600">Min Cost</div>
                    </div>
                    <div>
                      <div className="font-medium">{tier.minPerTeam ?? '—'}-{tier.maxPerTeam ?? '∞'}</div>
                      <div className="text-gray-600">Per Team</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tier Tips */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Tier Configuration Tips</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Base Price:</strong> Starting bid price - higher tiers should have higher base prices
              </li>
              <li>
                <strong>Min/Max Per Team:</strong> Quota constraints to ensure balanced team composition
              </li>
              <li>
                <strong>Budget Flexibility:</strong> 20-60% flexibility allows for strategic bidding
              </li>
              <li>
                <strong>Tier Order:</strong> Higher tiers (premium players) should appear first in the list
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </WizardStep>
  )
}