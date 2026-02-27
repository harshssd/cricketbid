'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AuctionHistoryEntry {
  player: string
  team: string
  price: number
  action?: string
}

interface AuctionProgressPanelProps {
  soldCount: number
  remaining: number
  deferredCount: number
  progressPercent: number
  recentSales: AuctionHistoryEntry[]
}

export function AuctionProgressPanel({
  soldCount,
  remaining,
  deferredCount,
  progressPercent,
  recentSales,
}: AuctionProgressPanelProps) {
  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sold</span>
              <span className="tabular-nums">{soldCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Remaining</span>
              <span className="tabular-nums">{remaining}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Deferred</span>
              <span className="tabular-nums">{deferredCount}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-3">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length > 0 ? (
            <div className="space-y-2">
              {recentSales.slice(-8).reverse().map((sale, i) => (
                <div key={i} className="flex justify-between text-sm items-center">
                  <span className="truncate">{sale.player}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {sale.action === 'SOLD' && (
                      <Badge variant="secondary" className="text-xs tabular-nums">{sale.price}</Badge>
                    )}
                    {sale.action === 'UNSOLD' && (
                      <Badge variant="outline" className="text-xs text-destructive">Unsold</Badge>
                    )}
                    {sale.action === 'DEFERRED' && (
                      <Badge variant="outline" className="text-xs">Deferred</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No sales yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
