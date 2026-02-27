'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Upload, Download, AlertCircle, CheckCircle, Loader2, X
} from 'lucide-react'

interface ParsedUser {
  name: string
  email: string
  role: 'CAPTAIN' | 'MODERATOR' | 'VIEWER'
}

interface UploadUserListProps {
  auctionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
}

export function UploadUserList({ auctionId, open, onOpenChange, onImportComplete }: UploadUserListProps) {
  const [csvContent, setCsvContent] = useState('')
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([])
  const [defaultRole, setDefaultRole] = useState<'CAPTAIN' | 'MODERATOR' | 'VIEWER'>('CAPTAIN')
  const [parseError, setParseError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    details?: { name: string; email: string; status: string }[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)
      parseContent(content)
    }
    reader.readAsText(file)
  }

  const parseContent = (content: string) => {
    setParseError(null)
    setImportResult(null)
    const users: ParsedUser[] = []
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    if (lines.length === 0) {
      setParseError('Content is empty')
      setParsedUsers([])
      return
    }

    // Detect if first line is a header
    const firstLine = lines[0].toLowerCase()
    const hasHeader = firstLine.includes('name') || firstLine.includes('email') || firstLine.includes('role')
    const startIndex = hasHeader ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      // Support CSV (comma) or TSV (tab) delimited
      const delimiter = line.includes('\t') ? '\t' : ','
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''))

      if (parts.length < 2) {
        // Try to extract just an email if single column
        const email = parts[0]
        if (email && email.includes('@')) {
          users.push({
            name: email.split('@')[0],
            email,
            role: defaultRole,
          })
        }
        continue
      }

      const name = parts[0]
      const email = parts[1]
      const roleStr = parts[2]?.toUpperCase()

      if (!email || !email.includes('@')) {
        continue // Skip invalid rows
      }

      let role = defaultRole
      if (roleStr === 'CAPTAIN' || roleStr === 'MODERATOR' || roleStr === 'VIEWER') {
        role = roleStr
      }

      users.push({ name: name || email.split('@')[0], email, role })
    }

    if (users.length === 0) {
      setParseError('No valid users found. Each line should have at least: name, email')
    }
    setParsedUsers(users)
  }

  const removeUser = (index: number) => {
    setParsedUsers(prev => prev.filter((_, i) => i !== index))
  }

  const handleImport = async () => {
    if (parsedUsers.length === 0) return
    setIsImporting(true)
    setImportResult(null)

    try {
      const response = await fetch(`/api/auctions/${auctionId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: parsedUsers,
          skipExisting: true,
        })
      })

      const result = await response.json()

      if (response.ok) {
        setImportResult({
          success: true,
          message: result.message,
          details: result.results?.details,
        })
        onImportComplete?.()
      } else {
        setImportResult({
          success: false,
          message: result.error || 'Failed to import users',
        })
      }
    } catch {
      setImportResult({
        success: false,
        message: 'Network error - failed to import users',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    const template = `name,email,role\n"John Doe","john@example.com","CAPTAIN"\n"Jane Smith","jane@example.com","VIEWER"`
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user_list_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    setCsvContent('')
    setParsedUsers([])
    setParseError(null)
    setImportResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload User List
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Default role */}
          <div>
            <Label>Default Role</Label>
            <Select value={defaultRole} onValueChange={(v) => setDefaultRole(v as typeof defaultRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAPTAIN">Captain</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Applied when no role column is provided in the CSV
            </p>
          </div>

          {/* File upload */}
          <div>
            <Label>Upload CSV File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-16 border-dashed"
            >
              <Upload className="h-5 w-5 mr-2" />
              Click to select file
            </Button>
          </div>

          {/* Paste area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Or Paste Content</Label>
              <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-3 w-3 mr-1" />
                Template
              </Button>
            </div>
            <Textarea
              placeholder={"name,email,role\nJohn Doe,john@example.com,CAPTAIN\nJane Smith,jane@example.com,VIEWER"}
              value={csvContent}
              onChange={(e) => {
                setCsvContent(e.target.value)
                if (e.target.value.trim()) {
                  parseContent(e.target.value)
                } else {
                  setParsedUsers([])
                  setParseError(null)
                }
              }}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: name, email, role (optional). Supports CSV, TSV, or email-per-line.
            </p>
          </div>

          {/* Parse error */}
          {parseError && (
            <Alert className="border-red-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedUsers.length > 0 && !importResult?.success && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Preview ({parsedUsers.length} user{parsedUsers.length !== 1 ? 's' : ''})
              </h4>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Role</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedUsers.map((user, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{user.name}</td>
                        <td className="p-2 font-mono text-xs">{user.email}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeUser(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <Alert className={importResult.success ? 'border-green-500' : 'border-red-500'}>
              {importResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>
                <p className="font-medium">{importResult.message}</p>
                {importResult.details && importResult.details.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {importResult.details.map((d, i) => (
                      <li key={i}>
                        {d.name} ({d.email}) — {d.status}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            {importResult?.success ? 'Done' : 'Cancel'}
          </Button>
          {!importResult?.success && (
            <Button
              onClick={handleImport}
              disabled={isImporting || parsedUsers.length === 0}
            >
              {isImporting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Import {parsedUsers.length} User{parsedUsers.length !== 1 ? 's' : ''}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
