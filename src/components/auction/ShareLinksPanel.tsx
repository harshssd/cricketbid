'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink, Share2, Users, Eye, Settings } from 'lucide-react'

interface ShareLinksPanelProps {
  auctionId: string
  auctionName: string
}

export function ShareLinksPanel({ auctionId, auctionName }: ShareLinksPanelProps) {
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(key)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const links = [
    {
      key: 'captain',
      label: 'Captain Dashboard',
      description: 'For team captains to place bids',
      icon: Users,
      url: `${origin}/captain/${auctionId}`,
    },
    {
      key: 'live',
      label: 'Live Spectator View',
      description: 'For viewers to watch live',
      icon: Eye,
      url: `${origin}/live/${auctionId}`,
    },
    {
      key: 'auctioneer',
      label: 'Auctioneer Dashboard',
      description: 'Current page — for co-auctioneers',
      icon: Settings,
      url: typeof window !== 'undefined' ? window.location.href : '',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Auction Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <div
              key={link.key}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{link.label}</div>
                  <div className="text-xs text-muted-foreground">{link.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => copyToClipboard(link.url, link.key)}
                >
                  {copiedLink === link.key ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}

        <Button
          className="w-full mt-2"
          variant={copiedLink === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            const message = `${auctionName} - Cricket Auction Links:\n\nCAPTAINS (for bidding):\n${origin}/captain/${auctionId}\n\nSPECTATORS (live view):\n${origin}/live/${auctionId}\n\nAUCTIONEERS (control panel):\n${typeof window !== 'undefined' ? window.location.href : ''}`
            copyToClipboard(message, 'all')
          }}
        >
          {copiedLink === 'all' ? (
            <><Check className="h-4 w-4 mr-1" /> All Links Copied</>
          ) : (
            <><Copy className="h-4 w-4 mr-1" /> Copy All Links</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
