'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Team {
  name: string
  coins: number
  originalCoins: number
  players: Array<{ name: string; price: number }>
}

interface TeamBudgetsSidebarProps {
  teams: Team[]
}

export function TeamBudgetsSidebar({ teams }: TeamBudgetsSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Budgets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {teams.map((team, i) => {
            const pct = team.originalCoins > 0 ? (team.coins / team.originalCoins) * 100 : 0
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium text-sm">{team.name}</div>
                  <div className="text-sm tabular-nums text-muted-foreground">
                    {team.coins} / {team.originalCoins}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="bg-primary h-full rounded-full"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {team.players.length} players
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
