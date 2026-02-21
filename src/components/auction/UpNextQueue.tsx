'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface UpNextQueueProps {
  queue: string[]
  startIndex: number
  count?: number
  getPlayerInfo: (name: string) => { tier: string; basePrice: number }
}

export function UpNextQueue({ queue, startIndex, count = 12, getPlayerInfo }: UpNextQueueProps) {
  const upcoming = queue.slice(startIndex + 1, startIndex + 1 + count)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Up Next ({Math.min(count, queue.length - startIndex - 1)} players)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {upcoming.map((playerName, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
              <span className="font-medium text-foreground">{playerName}</span>
              <Badge className="text-xs shrink-0 ml-2" variant="secondary">
                {getPlayerInfo(playerName).tier}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
