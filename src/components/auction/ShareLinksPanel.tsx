'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink, Share2, Users, Eye, Settings, Gamepad2 } from 'lucide-react'

interface Team {
  id: string
  name: string
  primary_color?: string
}

interface ShareLinksPanelProps {
  auctionId: string
  auctionName: string
}

export function ShareLinksPanel({ auctionId, auctionName }: ShareLinksPanelProps) {
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [bidderLinksExpanded, setBidderLinksExpanded] = useState(false)

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(key)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // Fetch teams for bidder links
  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch(`/api/auctions/${auctionId}/teams`)
        if (res.ok) {
          const data = await res.json()
          setTeams(data.teams || [])
        }
      } catch {
        // Teams fetch is non-critical
      }
    }
    fetchTeams()
  }, [auctionId])

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

        {/* Bidder Links Section */}
        {teams.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setBidderLinksExpanded(prev => !prev)}
              className="flex items-center gap-2 w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <Gamepad2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Bidder Links</div>
                <div className="text-xs text-muted-foreground">
                  Per-team bidding URLs ({teams.length} teams)
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{bidderLinksExpanded ? '▲' : '▼'}</span>
            </button>

            {bidderLinksExpanded && (
              <div className="mt-2 space-y-1.5 pl-2">
                {teams.map((team) => {
                  const bidderUrl = `${origin}/bid/${auctionId}_${team.id}`
                  const key = `bidder-${team.id}`
                  return (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {team.primary_color && (
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: team.primary_color }}
                          />
                        )}
                        <span className="text-xs font-medium truncate">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copyToClipboard(bidderUrl, key)}
                        >
                          {copiedLink === key ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => window.open(bidderUrl, '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

                <Button
                  className="w-full mt-1"
                  variant={copiedLink === 'all-bidders' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const bidderLinks = teams
                      .map(t => `${t.name}: ${origin}/bid/${auctionId}_${t.id}`)
                      .join('\n')
                    copyToClipboard(bidderLinks, 'all-bidders')
                  }}
                >
                  {copiedLink === 'all-bidders' ? (
                    <><Check className="h-4 w-4 mr-1" /> All Bidder Links Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copy All Bidder Links</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

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
