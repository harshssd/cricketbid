'use client'

import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { LiveTeam } from '@/hooks/useLiveAuction'
import { TeamCard } from './TeamCard'

interface AuctionCompleteProps {
  teams: LiveTeam[]
}

export function AuctionComplete({ teams }: AuctionCompleteProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col py-6 lg:py-10"
    >
      {/* Header */}
      <div className="text-center mb-6 lg:mb-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          <Trophy className="w-12 h-12 lg:w-16 lg:h-16 text-yellow-500 mx-auto mb-3 lg:mb-4" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Badge variant="secondary" className="text-sm px-4 py-1.5 font-bold uppercase tracking-widest">
            Auction Complete
          </Badge>
        </motion.div>
      </div>

      {/* All teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {teams.map((team, i) => (
          <motion.div
            key={team.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          >
            <TeamCard team={team} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
