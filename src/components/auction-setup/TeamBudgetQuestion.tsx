'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Slider } from '@/components/ui/slider'

interface TeamBudgetQuestionProps {
  value: number
  onChange: (value: number) => void
}

const presets = [300, 600, 1000, 2000, 5000]

export function TeamBudgetQuestion({ value, onChange }: TeamBudgetQuestionProps) {
  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <label className="block text-lg font-medium text-muted-foreground mb-6">
          Starting coins per team
        </label>

        {/* Large animated number display */}
        <div className="flex justify-center mb-6">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={value}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-6xl font-bold text-foreground tabular-nums"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Quick-select buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {presets.map((preset) => (
            <motion.button
              key={preset}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(preset)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors tabular-nums ${
                value === preset
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {preset.toLocaleString()}
            </motion.button>
          ))}
        </div>

        {/* Slider */}
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={100}
          max={10000}
          step={50}
        />
      </div>

      <div className="text-center text-muted-foreground text-sm">
        Between 100 and 10,000 coins
      </div>
    </div>
  )
}
