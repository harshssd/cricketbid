'use client'

import { motion } from 'framer-motion'
import type { LiveTeam } from '@/hooks/useLiveAuction'
import { TeamCard } from './TeamCard'

interface TeamsOverviewProps {
  teams: LiveTeam[]
}

export function TeamsOverview({ teams }: TeamsOverviewProps) {
  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 py-4">
      {teams.map((team, i) => (
        <motion.div
          key={team.name}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
        >
          <TeamCard team={team} />
        </motion.div>
      ))}
    </div>
  )
}
