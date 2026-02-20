import { FamousCricketer } from './types'

// Famous cricketers pool for dry run simulations
export const FAMOUS_CRICKETERS: FamousCricketer[] = [
  // PLATINUM TIER (12 players)
  {
    name: 'Virat Kohli',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    tier: 'PLATINUM'
  },
  {
    name: 'MS Dhoni',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Right-hand Bat',
    tier: 'PLATINUM'
  },
  {
    name: 'Sachin Tendulkar',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Medium',
    tier: 'PLATINUM'
  },
  {
    name: 'AB de Villiers',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Right-hand Bat',
    tier: 'PLATINUM'
  },
  {
    name: 'Ben Stokes',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Right-arm Fast-medium',
    tier: 'PLATINUM'
  },
  {
    name: 'Jasprit Bumrah',
    playingRole: 'BOWLER',
    bowlingStyle: 'Right-arm Fast',
    tier: 'PLATINUM'
  },
  {
    name: 'Kane Williamson',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    tier: 'PLATINUM'
  },
  {
    name: 'Pat Cummins',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast',
    tier: 'PLATINUM'
  },
  {
    name: 'Babar Azam',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    tier: 'PLATINUM'
  },
  {
    name: 'Rohit Sharma',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Off-break',
    tier: 'PLATINUM'
  },
  {
    name: 'Steve Smith',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Leg-break',
    tier: 'PLATINUM'
  },
  {
    name: 'Rashid Khan',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Leg-break',
    tier: 'PLATINUM'
  },

  // GOLD TIER (16 players)
  {
    name: 'KL Rahul',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Right-hand Bat',
    tier: 'GOLD'
  },
  {
    name: 'Jos Buttler',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Right-hand Bat',
    tier: 'GOLD'
  },
  {
    name: 'Ravindra Jadeja',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Orthodox',
    tier: 'GOLD'
  },
  {
    name: 'Trent Boult',
    playingRole: 'BOWLER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Fast-medium',
    tier: 'GOLD'
  },
  {
    name: 'Quinton de Kock',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Left-hand Bat',
    tier: 'GOLD'
  },
  {
    name: 'Hardik Pandya',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast-medium',
    tier: 'GOLD'
  },
  {
    name: 'Mitchell Starc',
    playingRole: 'BOWLER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Fast',
    tier: 'GOLD'
  },
  {
    name: 'Suryakumar Yadav',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    tier: 'GOLD'
  },
  {
    name: 'Shakib Al Hasan',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Orthodox',
    tier: 'GOLD'
  },
  {
    name: 'Glenn Maxwell',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Off-break',
    tier: 'GOLD'
  },
  {
    name: 'Rishabh Pant',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Left-hand Bat',
    tier: 'GOLD'
  },
  {
    name: 'Kagiso Rabada',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast',
    tier: 'GOLD'
  },
  {
    name: 'David Warner',
    playingRole: 'BATSMAN',
    battingStyle: 'Left-hand Bat',
    tier: 'GOLD'
  },
  {
    name: 'Joe Root',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Off-break',
    tier: 'GOLD'
  },
  {
    name: 'Shaheen Afridi',
    playingRole: 'BOWLER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Fast',
    tier: 'GOLD'
  },
  {
    name: 'Shreyas Iyer',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Off-break',
    tier: 'GOLD'
  },

  // SILVER TIER (16 players)
  {
    name: 'Shubman Gill',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    tier: 'SILVER'
  },
  {
    name: 'Devon Conway',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Left-hand Bat',
    tier: 'SILVER'
  },
  {
    name: 'Mohammed Siraj',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast-medium',
    tier: 'SILVER'
  },
  {
    name: 'Yuzvendra Chahal',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Leg-break',
    tier: 'SILVER'
  },
  {
    name: 'Marcus Stoinis',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast-medium',
    tier: 'SILVER'
  },
  {
    name: 'Ishan Kishan',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Left-hand Bat',
    tier: 'SILVER'
  },
  {
    name: 'Wanindu Hasaranga',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Leg-break',
    tier: 'SILVER'
  },
  {
    name: 'Axar Patel',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Orthodox',
    tier: 'SILVER'
  },
  {
    name: 'Adam Zampa',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Leg-break',
    tier: 'SILVER'
  },
  {
    name: 'Tim David',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    tier: 'SILVER'
  },
  {
    name: 'Deepak Chahar',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast-medium',
    tier: 'SILVER'
  },
  {
    name: 'Sam Curran',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Fast-medium',
    tier: 'SILVER'
  },
  {
    name: 'Kuldeep Yadav',
    playingRole: 'BOWLER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Chinaman',
    tier: 'SILVER'
  },
  {
    name: 'Sanju Samson',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Right-hand Bat',
    tier: 'SILVER'
  },
  {
    name: 'Cameron Green',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast-medium',
    tier: 'SILVER'
  },
  {
    name: 'Daryl Mitchell',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast-medium',
    tier: 'SILVER'
  },

  // BRONZE TIER (16 players)
  {
    name: 'Tilak Varma',
    playingRole: 'BATSMAN',
    battingStyle: 'Left-hand Bat',
    tier: 'BRONZE'
  },
  {
    name: 'Yashasvi Jaiswal',
    playingRole: 'BATSMAN',
    battingStyle: 'Left-hand Bat',
    tier: 'BRONZE'
  },
  {
    name: 'Matheesha Pathirana',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast',
    tier: 'BRONZE'
  },
  {
    name: 'Rinku Singh',
    playingRole: 'BATSMAN',
    battingStyle: 'Left-hand Bat',
    tier: 'BRONZE'
  },
  {
    name: 'Arshdeep Singh',
    playingRole: 'BOWLER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Fast-medium',
    tier: 'BRONZE'
  },
  {
    name: 'Rachin Ravindra',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Orthodox',
    tier: 'BRONZE'
  },
  {
    name: 'Dewald Brevis',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    tier: 'BRONZE'
  },
  {
    name: 'Harry Brook',
    playingRole: 'BATSMAN',
    battingStyle: 'Right-hand Bat',
    tier: 'BRONZE'
  },
  {
    name: 'Gus Atkinson',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast',
    tier: 'BRONZE'
  },
  {
    name: 'Travis Head',
    playingRole: 'BATSMAN',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Orthodox',
    tier: 'BRONZE'
  },
  {
    name: 'Abhishek Sharma',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Orthodox',
    tier: 'BRONZE'
  },
  {
    name: 'Spencer Johnson',
    playingRole: 'BOWLER',
    battingStyle: 'Left-hand Bat',
    bowlingStyle: 'Left-arm Fast',
    tier: 'BRONZE'
  },
  {
    name: 'Tanzim Hasan',
    playingRole: 'BOWLER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Fast',
    tier: 'BRONZE'
  },
  {
    name: 'Will Jacks',
    playingRole: 'ALL_ROUNDER',
    battingStyle: 'Right-hand Bat',
    bowlingStyle: 'Right-arm Off-break',
    tier: 'BRONZE'
  },
  {
    name: 'Jake Fraser-McGurk',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Right-hand Bat',
    tier: 'BRONZE'
  },
  {
    name: 'Dhruv Jurel',
    playingRole: 'WICKETKEEPER',
    battingStyle: 'Right-hand Bat',
    tier: 'BRONZE'
  }
]

// AI Captain Personalities for Dry Run
export const AI_CAPTAIN_STYLES = {
  AGGRESSIVE: {
    name: 'Aggressive',
    description: 'Bids high on Platinum and Gold. Front-loads spending.',
    strategy: 'High bids on top tiers, often runs tight in later rounds'
  },
  BALANCED: {
    name: 'Balanced',
    description: 'Spreads budget evenly across all tiers.',
    strategy: 'Moderate bids above base price on all players'
  },
  SNIPER: {
    name: 'Sniper',
    description: 'Targets 2-3 players and bids very high on them.',
    strategy: 'Goes all-out on specific targets, base price on others'
  },
  VALUE_HUNTER: {
    name: 'Value Hunter',
    description: 'Rarely exceeds base price on top tiers, dominates lower tiers.',
    strategy: 'Saves budget for Gold and Silver rounds'
  }
} as const