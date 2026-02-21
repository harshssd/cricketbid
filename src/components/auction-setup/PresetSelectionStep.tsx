'use client'

import { motion } from 'framer-motion'
import { Zap, Trophy, Settings } from 'lucide-react'

interface PresetSelectionStepProps {
  onSelectPreset: (preset: 'quick' | 'full' | 'custom') => void
}

const presets = [
  {
    id: 'quick' as const,
    label: 'Quick Match',
    description: '4 teams, 50 players, 600 coins',
    icon: Zap,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    bgHover: 'hover:border-emerald-400 hover:bg-emerald-500/5',
    values: { teamCount: 4, playerPoolSize: 50, teamBudget: 600 },
  },
  {
    id: 'full' as const,
    label: 'Full League',
    description: '8 teams, 100 players, 1200 coins',
    icon: Trophy,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/40',
    bgHover: 'hover:border-blue-400 hover:bg-blue-500/5',
    values: { teamCount: 8, playerPoolSize: 100, teamBudget: 1200 },
  },
  {
    id: 'custom' as const,
    label: 'Custom',
    description: 'Configure every setting yourself',
    icon: Settings,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    bgHover: 'hover:border-purple-400 hover:bg-purple-500/5',
    values: null,
  },
]

export function PresetSelectionStep({ onSelectPreset }: PresetSelectionStepProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {presets.map((preset, index) => {
          const Icon = preset.icon
          return (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectPreset(preset.id)}
              className={`flex flex-col items-center text-center p-8 rounded-2xl border-2 ${preset.borderColor} ${preset.bgHover} bg-card transition-colors cursor-pointer`}
            >
              <div className={`w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4`}>
                <Icon className={`h-7 w-7 ${preset.color}`} />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{preset.label}</h3>
              <p className="text-sm text-muted-foreground">{preset.description}</p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
