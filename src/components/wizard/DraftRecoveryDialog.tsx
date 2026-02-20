'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, FileText, Clock } from 'lucide-react'

interface DraftRecoveryDialogProps {
  draftInfo: {
    exists: boolean
    lastModified?: string
    currentStep?: number
    hasData?: boolean
  }
  onLoadDraft: () => void
  onStartFresh: () => void
}

export function DraftRecoveryDialog({ draftInfo, onLoadDraft, onStartFresh }: DraftRecoveryDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (draftInfo.exists && draftInfo.hasData) {
      setIsOpen(true)
    }
  }, [draftInfo])

  const formatLastModified = (dateString?: string) => {
    if (!dateString) return 'Unknown'

    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return date.toLocaleDateString()
  }

  const getStepName = (step: number) => {
    const stepNames = [
      'Basic Information',
      'Setup Mode',
      'Configuration',
      'Teams',
      'Tiers',
      'Branding',
      'Review'
    ]
    return stepNames[step] || `Step ${step + 1}`
  }

  const handleLoadDraft = () => {
    onLoadDraft()
    setIsOpen(false)
  }

  const handleStartFresh = () => {
    onStartFresh()
    setIsOpen(false)
  }

  if (!draftInfo.exists || !draftInfo.hasData) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <span>Resume Previous Auction?</span>
          </DialogTitle>
          <DialogDescription>
            We found a saved draft of your auction configuration. You can continue where you left off or start fresh.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Saved Draft</span>
                </div>
                <Badge variant="outline" className="bg-white">
                  {getStepName(draftInfo.currentStep || 0)}
                </Badge>
              </div>

              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <Clock className="h-4 w-4" />
                <span>Last modified: {formatLastModified(draftInfo.lastModified)}</span>
              </div>

              <div className="text-sm text-blue-600">
                Continue from where you left off, or start over with a fresh configuration.
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={handleStartFresh}
            className="mt-3 sm:mt-0"
          >
            Start Fresh
          </Button>
          <Button
            onClick={handleLoadDraft}
            className="w-full sm:w-auto"
          >
            Resume Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}