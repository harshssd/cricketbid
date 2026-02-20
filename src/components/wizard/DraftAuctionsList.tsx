'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, FileText, Clock, ArrowLeft, Users, DollarSign, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DraftAuction {
  id: string
  name: string
  description: string | null
  budget_per_team: number
  currency_name: string
  squad_size: number
  league_id: string | null
  created_at: string
  updated_at: string
  leagues?: { name: string; code: string } | null
  teams: { count: number }[]
}

interface DraftAuctionsListProps {
  onCreateNew: () => void
  onResumeDraft?: () => void
  onLoadServerDraft: (auctionId: string) => void
  hasLocalDraft: boolean
  localDraftName?: string
  localDraftLastModified?: string
}

export function DraftAuctionsList({
  onCreateNew,
  onResumeDraft,
  onLoadServerDraft,
  hasLocalDraft,
  localDraftName,
  localDraftLastModified,
}: DraftAuctionsListProps) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftAuction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('auctions')
        .select(`
          id,
          name,
          description,
          budget_per_team,
          currency_name,
          squad_size,
          league_id,
          created_at,
          updated_at,
          leagues ( name, code ),
          teams ( count )
        `)
        .eq('owner_id', user.id)
        .eq('status', 'DRAFT')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch drafts:', error)
      } else {
        const mapped = (data || []).map((d: any) => ({
          ...d,
          leagues: Array.isArray(d.leagues) ? d.leagues[0] || null : d.leagues,
        }))
        setDrafts(mapped)
      }
    } catch (error) {
      console.error('Failed to fetch drafts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadDraft = async (draftId: string) => {
    setLoadingDraftId(draftId)
    onLoadServerDraft(draftId)
  }

  const handleDeleteDraft = async (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation()
    setDeletingId(draftId)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase
        .from('auctions')
        .delete()
        .eq('id', draftId)

      if (error) throw error

      setDrafts(prev => prev.filter(d => d.id !== draftId))
      toast.success('Draft deleted')
    } catch (error) {
      console.error('Failed to delete draft:', error)
      toast.error('Failed to delete draft')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`
    return date.toLocaleDateString()
  }

  const hasDrafts = drafts.length > 0 || hasLocalDraft

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Auction</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {hasDrafts
              ? 'Resume a draft or start a new auction'
              : 'Start creating a new auction'}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/auctions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Auctions
        </Button>
      </div>

      {/* In-progress wizard draft (localStorage) */}
      {hasLocalDraft && (
        <Card
          className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 cursor-pointer hover:shadow-md transition-shadow"
          onClick={onResumeDraft}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                  <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{localDraftName || 'Unsaved Draft'}</h3>
                    <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-300">
                      In Progress
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Unsaved wizard progress
                    {localDraftLastModified && ` · Last edited ${formatDate(localDraftLastModified)}`}
                  </p>
                </div>
              </div>
              <Button size="sm">Resume</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved draft auctions from DB */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Saved Drafts ({drafts.length})
          </h2>
          {drafts.map((draft) => (
            <Card
              key={draft.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleLoadDraft(draft.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{draft.name}</h3>
                        {draft.leagues && (
                          <Badge variant="secondary" className="text-xs">
                            {draft.leagues.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(draft.updated_at)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>{draft.budget_per_team} {draft.currency_name}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{draft.teams?.[0]?.count || 0} teams</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteDraft(e, draft.id)}
                      disabled={deletingId === draft.id}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingDraftId === draft.id}
                    >
                      {loadingDraftId === draft.id ? 'Loading...' : 'Resume'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create new button */}
      <Card
        className="border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
        onClick={onCreateNew}
      >
        <CardContent className="p-8 text-center">
          <Plus className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">Create New Auction</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start fresh with the auction creation wizard
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
