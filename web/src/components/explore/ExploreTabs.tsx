'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

interface ExploreTabsProps {
  activeTab: string
}

export function ExploreTabs({ activeTab }: ExploreTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleTabChange = (tab: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'clubs') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }
      // Clear search when switching tabs
      params.delete('q')
      router.replace(`/explore?${params.toString()}`)
    })
  }

  return (
    <div className="flex items-center gap-1 border-b border-white/[0.06] mb-8">
      <button
        onClick={() => handleTabChange('clubs')}
        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'clubs'
            ? 'border-blue-400 text-blue-400'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        } ${isPending ? 'opacity-50' : ''}`}
      >
        Clubs
      </button>
      <button
        onClick={() => handleTabChange('tournaments')}
        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'tournaments'
            ? 'border-blue-400 text-blue-400'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        } ${isPending ? 'opacity-50' : ''}`}
      >
        Tournaments
      </button>
    </div>
  )
}
