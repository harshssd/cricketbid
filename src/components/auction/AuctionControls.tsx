'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Undo2, Gavel, Clock } from 'lucide-react'

interface Team {
  name: string
  coins: number
  originalCoins: number
  players: Array<{ name: string; price: number }>
}

interface RoundBid {
  id: string
  teamId: string
  teamName: string
  amount: number
  submittedAt: string
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
  roundBids?: RoundBid[]
  onSelectBid?: (bid: RoundBid) => void
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
  roundBids = [],
  onSelectBid,
}: AuctionControlsProps) {
  return (
    <div className="space-y-4">
      {/* Incoming Bids */}
      <AnimatePresence>
        {roundBids.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Gavel className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Incoming Bids ({roundBids.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {roundBids.map((bid, index) => {
                  const isSelected = sellTeam === bid.teamName && sellPrice === bid.amount
                  const isHighest = index === 0
                  return (
                    <motion.button
                      key={bid.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelectBid?.(bid)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-md border transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isHighest && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-amber-500/90">
                            TOP
                          </Badge>
                        )}
                        <span className="font-medium text-sm text-foreground">{bid.teamName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tabular-nums text-foreground">{bid.amount}</span>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {new Date(bid.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        {teams.map((team) => {
          const teamBid = roundBids.find(b => b.teamName === team.name)
          return (
            <motion.button
              key={team.name}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSellTeamChange(team.name)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                sellTeam === team.name
                  ? 'border-primary bg-primary/10'
                  : teamBid
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-foreground truncate">{team.name}</div>
                {teamBid && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500/50 text-amber-600 shrink-0 ml-1">
                    {teamBid.amount}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{team.coins} coins</div>
            </motion.button>
          )
        })}
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
