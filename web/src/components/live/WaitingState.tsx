'use client'

import { motion } from 'framer-motion'
import { Loader2, Users, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WaitingStateProps {
  state: 'connecting' | 'waiting'
}

export function WaitingState({ state }: WaitingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex items-center justify-center py-12"
    >
      <Card className="w-full max-w-md">
        <CardContent className="py-12">
          {state === 'connecting' ? (
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-muted-foreground animate-spin mx-auto mb-4" />
              <p className="text-foreground font-medium">Connecting to auction...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait</p>
            </div>
          ) : (
            <div className="text-center">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-foreground font-medium text-lg">Auction starting soon...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Waiting for the auctioneer to begin
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
