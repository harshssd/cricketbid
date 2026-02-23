'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'

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
  const [expanded, setExpanded] = useState(true)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Team Budgets</span>
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
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
