import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Users, Trophy, Coins, Target } from 'lucide-react'

interface AuctionSetup {
  playerPoolSize: number
  teamCount: number
  teamBudget: number
  auctionName: string
  teams: Array<{ name: string; coins: number }>
}

interface FinalSetupQuestionProps {
  setup: AuctionSetup
  onCreateAuction: () => void
}

export function FinalSetupQuestion({ setup, onCreateAuction }: FinalSetupQuestionProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Summary Card */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">Auction Summary</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-muted-foreground text-sm">Player Pool</div>
              <div className="text-foreground font-medium tabular-nums">{setup.playerPoolSize} players</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-muted-foreground text-sm">Teams</div>
              <div className="text-foreground font-medium tabular-nums">{setup.teamCount} teams</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
              <Coins className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-muted-foreground text-sm">Starting Budget</div>
              <div className="text-foreground font-medium tabular-nums">{setup.teamBudget} coins</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-muted-foreground text-sm">Total Pool</div>
              <div className="text-foreground font-medium tabular-nums">{setup.teamCount * setup.teamBudget} coins</div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-muted-foreground text-sm">Auction Name</div>
          <div className="text-foreground font-medium">{setup.auctionName}</div>
        </div>
      </Card>

      {/* What happens next */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">What happens next?</h3>
        <div className="space-y-3 text-muted-foreground">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold mt-0.5">1</div>
            <div>
              <div className="font-medium text-foreground">Add Players</div>
              <div className="text-sm">You&apos;ll be able to add up to {setup.playerPoolSize} players to your auction pool</div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold mt-0.5">2</div>
            <div>
              <div className="font-medium text-foreground">Set Up Teams</div>
              <div className="text-sm">Customize your {setup.teamCount} team names and invite captains</div>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold mt-0.5">3</div>
            <div>
              <div className="font-medium text-foreground">Start Auction</div>
              <div className="text-sm">Begin the live auction with all participants</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Create Button */}
      <div className="text-center pt-4">
        <Button
          onClick={onCreateAuction}
          size="lg"
          className="px-12 py-4 text-lg font-medium"
        >
          Create Auction
        </Button>
        <div className="text-muted-foreground text-sm mt-2">
          This will create your auction and take you to the setup page
        </div>
      </div>
    </div>
  )
}
