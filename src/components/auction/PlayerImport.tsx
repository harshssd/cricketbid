'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Upload, Download, Plus, X, AlertCircle, CheckCircle,
  FileText, Users, Loader2, ClipboardPaste, ChevronDown
} from 'lucide-react'
import { parseCSV, generateCSVTemplate, normalizePlayingRole, PlayerCSVRow } from '@/lib/csv'
import { motion, AnimatePresence } from 'framer-motion'

interface Tier {
  id: string
  name: string
  basePrice: number
  color: string
}

interface ManualPlayer {
  _key: string
  name: string
  playingRole: string
  tierId: string
  battingStyle?: string
  bowlingStyle?: string
  customTags?: string
  image?: string
  expanded?: boolean
}

interface PlayerImportProps {
  auctionId: string
  tiers: Tier[]
  existingPlayers?: number
  onImportComplete?: (players: any[]) => void
}

type TabId = 'paste' | 'upload' | 'manual'

const ROLES = [
  { value: 'BATSMAN', label: 'Batsman' },
  { value: 'BOWLER', label: 'Bowler' },
  { value: 'ALL_ROUNDER', label: 'All-rounder' },
  { value: 'WICKETKEEPER', label: 'Wicketkeeper' },
]

let keyCounter = 0
function nextKey() { return `mp_${++keyCounter}` }

export function PlayerImport({ auctionId, tiers, existingPlayers = 0, onImportComplete }: PlayerImportProps) {
  const [activeTab, setActiveTab] = useState<TabId>('paste')
  const [csvContent, setCsvContent] = useState('')
  const [parsedPlayers, setParsedPlayers] = useState<PlayerCSVRow[]>([])
  const [manualPlayers, setManualPlayers] = useState<ManualPlayer[]>([])
  const [overwrite, setOverwrite] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  // Manual entry inline form
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('BATSMAN')
  const [newTier, setNewTier] = useState(tiers[0]?.id || '')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set default tier when tiers load
  useEffect(() => {
    if (tiers.length > 0 && !newTier) {
      setNewTier(tiers[0].id)
    }
  }, [tiers, newTier])

  // ── CSV parsing ────────────────────────────────────────────────

  const doParse = useCallback((content: string) => {
    if (!content.trim()) {
      setParsedPlayers([])
      setParseErrors([])
      setParseWarnings([])
      return
    }
    const result = parseCSV(content)
    setParseErrors(result.errors)
    setParseWarnings(result.warnings)
    if (result.success && result.data) {
      setParsedPlayers(result.data)
    } else {
      setParsedPlayers([])
    }
  }, [])

  const handlePasteChange = (value: string) => {
    setCsvContent(value)
    setImportResult(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doParse(value), 300)
  }

  const handleFileUpload = (file: File) => {
    setUploadedFileName(file.name)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)
      doParse(content)
    }
    reader.readAsText(file)
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFileUpload(file)
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

  // ── Manual entry ───────────────────────────────────────────────

  const addManualPlayer = () => {
    if (!newName.trim()) return
    const player: ManualPlayer = {
      _key: nextKey(),
      name: newName.trim(),
      playingRole: newRole,
      tierId: newTier || tiers[0]?.id || '',
    }
    setManualPlayers(prev => [...prev, player])
    setNewName('')
    setNewRole('BATSMAN')
    setImportResult(null)
    nameInputRef.current?.focus()
  }

  const removeManualPlayer = (key: string) => {
    setManualPlayers(prev => prev.filter(p => p._key !== key))
  }

  const toggleManualPlayerExpand = (key: string) => {
    setManualPlayers(prev => prev.map(p =>
      p._key === key ? { ...p, expanded: !p.expanded } : p
    ))
  }

  const updateManualPlayer = (key: string, updates: Partial<ManualPlayer>) => {
    setManualPlayers(prev => prev.map(p =>
      p._key === key ? { ...p, ...updates } : p
    ))
  }

  // ── Import ─────────────────────────────────────────────────────

  const getTierIdByName = (tierName: string): string | undefined => {
    return tiers.find(tier =>
      tier.name.toLowerCase() === tierName.toLowerCase()
    )?.id
  }

  const getPlayersToImport = () => {
    if (activeTab === 'manual') {
      return manualPlayers
        .filter(p => p.name && p.playingRole && p.tierId)
        .map(({ _key, expanded, ...rest }) => rest)
    }
    // paste or upload both use parsedPlayers
    return parsedPlayers.map(player => {
      const { role, notes } = normalizePlayingRole(player.playingRole)
      const allTags = [player.customTags, ...notes].filter(Boolean).join(', ')
      return {
        ...player,
        playingRole: role,
        customTags: allTags || undefined,
        tierId: getTierIdByName(player.tier)
      }
    }).filter(p => p.tierId)
  }

  const importCount = activeTab === 'manual'
    ? manualPlayers.filter(p => p.name && p.playingRole && p.tierId).length
    : parsedPlayers.length

  const handleImport = async () => {
    setIsImporting(true)
    setImportResult(null)
    try {
      const playersToImport = getPlayersToImport()

      if (playersToImport.length === 0) {
        setImportResult({ success: false, message: 'No valid players to import' })
        return
      }

      const response = await fetch(`/api/auctions/${auctionId}/players/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: playersToImport, overwrite })
      })

      const result = await response.json()

      if (response.ok) {
        setImportResult({ success: true, message: result.message })
        setCsvContent('')
        setParsedPlayers([])
        setManualPlayers([])
        setUploadedFileName(null)
        setParseErrors([])
        setParseWarnings([])
        onImportComplete?.(result.players)
      } else {
        setImportResult({
          success: false,
          message: result.error || 'Failed to import players'
        })
      }
    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({ success: false, message: 'Failed to import players' })
    } finally {
      setIsImporting(false)
    }
  }

  // ── Render helpers ─────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'paste', label: 'Paste', icon: <ClipboardPaste className="w-3.5 h-3.5" /> },
    { id: 'upload', label: 'Upload CSV', icon: <Upload className="w-3.5 h-3.5" /> },
    { id: 'manual', label: 'Add One by One', icon: <Plus className="w-3.5 h-3.5" /> },
  ]

  const tierLabel = (tierId: string) => tiers.find(t => t.id === tierId)?.name || tierId

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Import Players</h2>
          <p className="text-sm text-muted-foreground">
            Add players to your auction pool
          </p>
        </div>
        {existingPlayers > 0 && (
          <Badge variant="outline" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1" />
            {existingPlayers} existing
          </Badge>
        )}
      </div>

      {/* Format Reference Card */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 text-xs">
              <p className="font-medium text-sm text-foreground">Expected columns (CSV or tab-separated):</p>
              <p>
                <code className="bg-background px-1.5 py-0.5 rounded border text-[11px]">name</code>*,{' '}
                <code className="bg-background px-1.5 py-0.5 rounded border text-[11px]">playingRole</code>*,{' '}
                <code className="bg-background px-1.5 py-0.5 rounded border text-[11px]">tier</code>*,{' '}
                <code className="bg-background px-1.5 py-0.5 rounded border text-[11px]">battingStyle</code>,{' '}
                <code className="bg-background px-1.5 py-0.5 rounded border text-[11px]">bowlingStyle</code>,{' '}
                <code className="bg-background px-1.5 py-0.5 rounded border text-[11px]">customTags</code>
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                <span><strong className="text-foreground">Roles:</strong> Batsman, Bowler, All-rounder, Wicketkeeper</span>
                <span><strong className="text-foreground">Tiers:</strong> {tiers.length > 0 ? tiers.map(t => t.name).join(', ') : 'Tier 0, Tier 1, Tier 2, Tier 3'}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 text-xs h-7" onClick={handleDownloadTemplate}>
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Switcher */}
      <div className="flex bg-muted p-1 rounded-lg gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id)
              setImportResult(null)
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── Paste Tab ──────────────────────────────── */}
          {activeTab === 'paste' && (
            <Textarea
              placeholder={`name,playingRole,tier\nVirat Kohli,Batsman,Tier 0\nJasprit Bumrah,Bowler,Tier 0\nRavindra Jadeja,All-rounder,Tier 1`}
              value={csvContent}
              onChange={(e) => handlePasteChange(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          )}

          {/* ── Upload Tab ─────────────────────────────── */}
          {activeTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/40'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {uploadedFileName ? (
                  <div className="space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-primary" />
                    <p className="font-medium text-sm">{uploadedFileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {parsedPlayers.length > 0
                        ? `${parsedPlayers.length} players parsed`
                        : 'Click to replace'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Drop a CSV file here or click to browse</p>
                    <p className="text-xs text-muted-foreground">Accepts .csv files</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Manual Tab ─────────────────────────────── */}
          {activeTab === 'manual' && (
            <div className="space-y-3">
              {/* Inline add form */}
              <div className="flex items-center gap-2">
                <Input
                  ref={nameInputRef}
                  placeholder="Player name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addManualPlayer() }}
                  className="flex-1 h-9 text-sm"
                />
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newTier} onValueChange={setNewTier}>
                  <SelectTrigger className="w-[110px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map(tier => (
                      <SelectItem key={tier.id} value={tier.id}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tier.color }} />
                          {tier.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-9 px-3"
                  onClick={addManualPlayer}
                  disabled={!newName.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Added players list */}
              {manualPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No players added yet</p>
                  <p className="text-xs mt-0.5">Type a name above and press Enter</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {manualPlayers.map(player => (
                      <motion.div
                        key={player._key}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="border rounded-md overflow-hidden">
                          {/* Compact row */}
                          <div className="flex items-center gap-2 px-3 py-1.5">
                            <span className="text-sm font-medium flex-1 truncate">{player.name}</span>
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {ROLES.find(r => r.value === player.playingRole)?.label || player.playingRole}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {tierLabel(player.tierId)}
                            </Badge>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => toggleManualPlayerExpand(player._key)}
                            >
                              <motion.div
                                animate={{ rotate: player.expanded ? 180 : 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </motion.div>
                            </button>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => removeManualPlayer(player._key)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Expanded optional fields */}
                          <AnimatePresence initial={false}>
                            {player.expanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-2 gap-2 px-3 pb-2 border-t pt-2">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Batting Style</label>
                                    <Input
                                      value={player.battingStyle || ''}
                                      onChange={(e) => updateManualPlayer(player._key, { battingStyle: e.target.value })}
                                      placeholder="e.g., Right-hand bat"
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Bowling Style</label>
                                    <Input
                                      value={player.bowlingStyle || ''}
                                      onChange={(e) => updateManualPlayer(player._key, { bowlingStyle: e.target.value })}
                                      placeholder="e.g., Right-arm fast"
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Custom Tags</label>
                                    <Input
                                      value={player.customTags || ''}
                                      onChange={(e) => updateManualPlayer(player._key, { customTags: e.target.value })}
                                      placeholder="e.g., Captain, Star"
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Image URL</label>
                                    <Input
                                      value={player.image || ''}
                                      onChange={(e) => updateManualPlayer(player._key, { image: e.target.value })}
                                      placeholder="https://..."
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Errors & Warnings */}
      {(parseErrors.length > 0 || parseWarnings.length > 0) && activeTab !== 'manual' && (
        <div className="space-y-2">
          {parseErrors.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                {parseErrors.map((err, i) => (
                  <p key={i} className="text-destructive text-xs">{err}</p>
                ))}
              </div>
            </div>
          )}
          {parseWarnings.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 text-sm">
              <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                {parseWarnings.map((warn, i) => (
                  <p key={i} className="text-yellow-600 text-xs">{warn}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`flex items-center gap-2 p-3 rounded-md border text-sm ${
          importResult.success
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-destructive/30 bg-destructive/5'
        }`}>
          {importResult.success ? (
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          )}
          <p className={`text-xs ${importResult.success ? 'text-green-700' : 'text-destructive'}`}>
            {importResult.message}
          </p>
        </div>
      )}

      {/* Preview Table (CSV tabs) */}
      {parsedPlayers.length > 0 && activeTab !== 'manual' && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium">{parsedPlayers.length} players ready to import</p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Role</th>
                    <th className="text-left px-4 py-2 font-medium">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedPlayers.map((player, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-1.5">{player.name}</td>
                      <td className="px-4 py-1.5">{player.playingRole}</td>
                      <td className="px-4 py-1.5">{player.tier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Action */}
      {importCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="overwrite"
                    checked={overwrite}
                    onCheckedChange={setOverwrite}
                  />
                  <Label htmlFor="overwrite" className="text-xs">
                    Overwrite existing players
                  </Label>
                </div>
                {existingPlayers > 0 && overwrite && (
                  <Badge variant="destructive" className="text-xs">
                    Will delete {existingPlayers} existing
                  </Badge>
                )}
              </div>
              <Button
                onClick={handleImport}
                disabled={isImporting || importCount === 0}
                size="sm"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Import {importCount} Player{importCount !== 1 ? 's' : ''}
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
