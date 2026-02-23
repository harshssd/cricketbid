'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import type { LastSoldEvent } from '@/hooks/useLiveAuction'

interface SoldCelebrationProps {
  event: LastSoldEvent
  showSoldAmount?: boolean
}

export function SoldCelebration({ event, showSoldAmount = false }: SoldCelebrationProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
      >
        {/* SOLD badge */}
        <motion.div className="mb-6">
          <Badge className="text-base lg:text-lg px-6 py-2 font-bold uppercase tracking-widest bg-success text-success-foreground">
            Sold
          </Badge>
        </motion.div>

        {/* Player name */}
        <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-2">
          {event.player}
        </h2>

        {/* Sold amount */}
        {showSoldAmount && event.price > 0 && (
          <motion.p
            className="text-muted-foreground text-lg lg:text-2xl font-mono tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {event.price.toLocaleString()}
          </motion.p>
        )}

        {/* Team */}
        <motion.div
          className="flex items-center gap-2.5 mt-6"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0, type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: event.teamColor }}
          />
          <span className="text-foreground text-lg lg:text-xl font-medium">{event.team}</span>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
