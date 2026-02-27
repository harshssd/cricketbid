'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NowAuctioningCardProps {
  playerName: string | null
  tierLabel: string
  basePrice: number
  auctionIndex: number
  isComplete: boolean
  onFinishAuction: () => void
  children?: React.ReactNode
}

export function NowAuctioningCard({
  playerName,
  tierLabel,
  basePrice,
  auctionIndex,
  isComplete,
  onFinishAuction,
  children,
}: NowAuctioningCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
          NOW AUCTIONING
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isComplete ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={auctionIndex}
              initial={{ x: 80, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: -80, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="text-center"
            >
              <div className="mb-4">
                <h2 className="text-3xl font-bold text-foreground">{playerName}</h2>
                <div className="flex items-center justify-center space-x-4 mt-2">
                  <Badge>{tierLabel}</Badge>
                  <Badge variant="secondary" className="tabular-nums">Base: {basePrice}</Badge>
                </div>
              </div>
              {children}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-8">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-2xl font-bold mb-2">Auction Complete</h2>
            <div className="space-x-2">
              <Button onClick={onFinishAuction}>Finish Auction</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
