'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload, Download, Plus, X, AlertCircle, CheckCircle,
  FileText, Users, Loader2
} from 'lucide-react'
import { parseCSV, generateCSVTemplate, normalizePlayingRole, PlayerCSVRow } from '@/lib/csv'

interface Tier {
  id: string
  name: string
  basePrice: number
  color: string
}

interface Player {
  id?: string
  name: string
  playingRole: string
  battingStyle?: string
  bowlingStyle?: string
  customTags?: string
  tierId: string
  image?: string
}

interface PlayerImportProps {
  auctionId: string
  tiers: Tier[]
  existingPlayers?: number
  onImportComplete?: (players: any[]) => void
}

export function PlayerImport({ auctionId, tiers, existingPlayers = 0, onImportComplete }: PlayerImportProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv')
  const [csvContent, setCsvContent] = useState('')
  const [parsedPlayers, setParsedPlayers] = useState<PlayerCSVRow[]>([])
  const [manualPlayers, setManualPlayers] = useState<Player[]>([])
  const [overwrite, setOverwrite] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    errors?: string[]
    warnings?: string[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)
      handleCSVParse(content)
    }
    reader.readAsText(file)
  }

  const handleCSVParse = (content: string) => {
    const result = parseCSV(content)
    setImportResult({
      success: result.success,
      message: result.success
        ? `Successfully parsed ${result.data?.length || 0} players`
        : 'Failed to parse CSV file',
      errors: result.errors,
      warnings: result.warnings
    })

    if (result.success && result.data) {
      setParsedPlayers(result.data)
    } else {
      setParsedPlayers([])
    }
  }

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate()
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'player_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const addManualPlayer = () => {
    const newPlayer: Player = {
      name: '',
      playingRole: '',
      tierId: tiers[0]?.id || '',
    }
    setManualPlayers([...manualPlayers, newPlayer])
  }

  const updateManualPlayer = (index: number, updates: Partial<Player>) => {
    const updated = [...manualPlayers]
    updated[index] = { ...updated[index], ...updates }
    setManualPlayers(updated)
  }

  const removeManualPlayer = (index: number) => {
    const updated = [...manualPlayers]
    updated.splice(index, 1)
    setManualPlayers(updated)
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const playersToImport = activeTab === 'csv'
        ? parsedPlayers.map(player => {
            const { role, notes } = normalizePlayingRole(player.playingRole)
            // Merge extracted notes into customTags
            const allTags = [player.customTags, ...notes].filter(Boolean).join(', ')
            return {
              ...player,
              playingRole: role,
              customTags: allTags || undefined,
              tierId: getTierIdByName(player.tier)
            }
          }).filter(player => player.tierId) // Filter out invalid tiers
        : manualPlayers.filter(player => player.name && player.playingRole && player.tierId)

      if (playersToImport.length === 0) {
        setImportResult({
          success: false,
          message: 'No valid players to import'
        })
        return
      }

      const response = await fetch(`/api/auctions/${auctionId}/players/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: playersToImport,
          overwrite
        })
      })

      const result = await response.json()

      if (response.ok) {
        setImportResult({
          success: true,
          message: result.message
        })

        // Reset form
        setCsvContent('')
        setParsedPlayers([])
        setManualPlayers([])

        // Call callback
        onImportComplete?.(result.players)
      } else {
        setImportResult({
          success: false,
          message: result.error || 'Failed to import players',
          errors: result.details?.errors || []
        })
      }
    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({
        success: false,
        message: 'Failed to import players'
      })
    } finally {
      setIsImporting(false)
    }
  }

  const getTierIdByName = (tierName: string): string | undefined => {
    return tiers.find(tier =>
      tier.name.toLowerCase() === tierName.toLowerCase()
    )?.id
  }

  const playersToImport = activeTab === 'csv' ? parsedPlayers : manualPlayers

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Import Players</h2>
          <p className="text-muted-foreground">
            Add players to your auction via CSV upload or manual entry
          </p>
        </div>
        {existingPlayers > 0 && (
          <Badge variant="outline">
            <Users className="h-4 w-4 mr-1" />
            {existingPlayers} existing players
          </Badge>
        )}
      </div>

      {/* Import Method Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <Button
          variant={activeTab === 'csv' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('csv')}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          CSV Upload
        </Button>
        <Button
          variant={activeTab === 'manual' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('manual')}
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Manual Entry
        </Button>
      </div>

      {/* CSV Upload Tab */}
      {activeTab === 'csv' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              CSV Upload
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Upload CSV File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-20 border-dashed"
              >
                <Upload className="h-6 w-6 mr-2" />
                Click to select CSV file
              </Button>
            </div>

            <div>
              <Label>Or Paste CSV Content</Label>
              <Textarea
                placeholder="Paste your CSV content here..."
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value)
                  if (e.target.value.trim()) {
                    handleCSVParse(e.target.value)
                  } else {
                    setParsedPlayers([])
                    setImportResult(null)
                  }
                }}
                rows={8}
              />
            </div>

            {importResult && (
              <Alert className={importResult.success ? 'border-green-500' : 'border-red-500'}>
                {importResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {importResult.message}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <ul className="mt-2 ml-4 list-disc">
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="text-red-600">{error}</li>
                      ))}
                    </ul>
                  )}
                  {importResult.warnings && importResult.warnings.length > 0 && (
                    <ul className="mt-2 ml-4 list-disc">
                      {importResult.warnings.map((warning, index) => (
                        <li key={index} className="text-yellow-600">{warning}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {parsedPlayers.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Preview ({parsedPlayers.length} players)</h3>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-left p-2">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPlayers.slice(0, 10).map((player, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{player.name}</td>
                          <td className="p-2">{player.playingRole}</td>
                          <td className="p-2">{player.tier}</td>
                        </tr>
                      ))}
                      {parsedPlayers.length > 10 && (
                        <tr className="border-t">
                          <td colSpan={3} className="p-2 text-center text-muted-foreground">
                            ... and {parsedPlayers.length - 10} more players
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Manual Entry
              <Button size="sm" onClick={addManualPlayer}>
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {manualPlayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2" />
                <p>No players added yet</p>
                <p className="text-sm">Click "Add Player" to start</p>
              </div>
            ) : (
              <div className="space-y-4">
                {manualPlayers.map((player, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-medium">Player {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeManualPlayer(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Name *</Label>
                          <Input
                            value={player.name}
                            onChange={(e) => updateManualPlayer(index, { name: e.target.value })}
                            placeholder="Player name"
                          />
                        </div>

                        <div>
                          <Label>Playing Role *</Label>
                          <Input
                            value={player.playingRole}
                            onChange={(e) => updateManualPlayer(index, { playingRole: e.target.value })}
                            placeholder="e.g., Batsman, Bowler, All-rounder"
                          />
                        </div>

                        <div>
                          <Label>Tier *</Label>
                          <Select
                            value={player.tierId}
                            onValueChange={(value) => updateManualPlayer(index, { tierId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiers.map(tier => (
                                <SelectItem key={tier.id} value={tier.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: tier.color }}
                                    />
                                    {tier.name} ({tier.basePrice})
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Batting Style</Label>
                          <Input
                            value={player.battingStyle || ''}
                            onChange={(e) => updateManualPlayer(index, { battingStyle: e.target.value })}
                            placeholder="e.g., Right-hand bat"
                          />
                        </div>

                        <div>
                          <Label>Bowling Style</Label>
                          <Input
                            value={player.bowlingStyle || ''}
                            onChange={(e) => updateManualPlayer(index, { bowlingStyle: e.target.value })}
                            placeholder="e.g., Right-arm fast"
                          />
                        </div>

                        <div>
                          <Label>Image URL</Label>
                          <Input
                            value={player.image || ''}
                            onChange={(e) => updateManualPlayer(index, { image: e.target.value })}
                            placeholder="https://example.com/player.jpg"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label>Custom Tags</Label>
                          <Input
                            value={player.customTags || ''}
                            onChange={(e) => updateManualPlayer(index, { customTags: e.target.value })}
                            placeholder="e.g., Captain, Star Player"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Options and Action */}
      {playersToImport.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="overwrite"
                    checked={overwrite}
                    onCheckedChange={setOverwrite}
                  />
                  <Label htmlFor="overwrite">
                    Overwrite existing players
                  </Label>
                </div>
                {existingPlayers > 0 && overwrite && (
                  <Badge variant="destructive">
                    Will delete {existingPlayers} existing players
                  </Badge>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={isImporting || playersToImport.length === 0}
                className="min-w-32"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {playersToImport.length} Players
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}