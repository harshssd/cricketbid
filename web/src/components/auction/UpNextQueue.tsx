'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface UpNextQueueProps {
  queue: string[]
  startIndex: number
  count?: number
  getPlayerInfo: (name: string) => { tier: string; basePrice: number }
}

export function UpNextQueue({ queue, startIndex, count = 12, getPlayerInfo }: UpNextQueueProps) {
  const [expanded, setExpanded] = useState(false)
  const upcoming = queue.slice(startIndex + 1, startIndex + 1 + count)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Up Next ({Math.min(count, queue.length - startIndex - 1)} players)</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded(prev => !prev)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
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
      )}
    </Card>
  )
}
