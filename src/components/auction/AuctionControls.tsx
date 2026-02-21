'use client'

import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Undo2 } from 'lucide-react'

interface Team {
  name: string
  coins: number
  originalCoins: number
  players: Array<{ name: string; price: number }>
}

interface AuctionControlsProps {
  teams: Team[]
  sellPrice: number
  onSellPriceChange: (price: number) => void
  sellTeam: string
  onSellTeamChange: (team: string) => void
  basePrice: number
  onSold: () => void
  onDefer: () => void
  onUnsold: () => void
  onUndoLast: () => void
  canUndo: boolean
}

export function AuctionControls({
  teams,
  sellPrice,
  onSellPriceChange,
  sellTeam,
  onSellTeamChange,
  basePrice,
  onSold,
  onDefer,
  onUnsold,
  onUndoLast,
  canUndo,
}: AuctionControlsProps) {
  return (
    <div className="space-y-4">
      {/* Price input */}
      <div className="flex justify-center">
        <Input
          type="number"
          placeholder="Price"
          className="w-32 text-center tabular-nums text-lg"
          value={sellPrice || basePrice}
          onChange={(e) => onSellPriceChange(Number(e.target.value))}
        />
      </div>

      {/* Team selection buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {teams.map((team) => (
          <motion.button
            key={team.name}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSellTeamChange(team.name)}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              sellTeam === team.name
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted'
            }`}
          >
            <div className="font-medium text-sm text-foreground truncate">{team.name}</div>
            <div className="text-xs text-muted-foreground tabular-nums">{team.coins} coins</div>
          </motion.button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <Button
            className="h-14 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
            disabled={!sellTeam}
            onClick={onSold}
          >
            SOLD
          </Button>
          <Button
            variant="outline"
            className="h-14 text-lg font-bold"
            onClick={onDefer}
          >
            DEFER
          </Button>
          <Button
            className="h-14 text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={onUnsold}
          >
            UNSOLD
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground"
          disabled={!canUndo}
          onClick={onUndoLast}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo Last
        </Button>
      </div>
    </div>
  )
}
