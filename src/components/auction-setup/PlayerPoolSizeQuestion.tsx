'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Slider } from '@/components/ui/slider'

interface PlayerPoolSizeQuestionProps {
  value: number
  onChange: (value: number) => void
}

const ticks = [20, 50, 100, 150, 200]

export function PlayerPoolSizeQuestion({ value, onChange }: PlayerPoolSizeQuestionProps) {
  return (
    <div className="max-w-md mx-auto">
      <div className="mb-8">
        <label className="block text-lg font-medium text-muted-foreground mb-6">
          Number of players in the pool
        </label>

        {/* Large animated number display */}
        <div className="flex justify-center mb-8">
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

        {/* Slider */}
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={8}
          max={200}
          step={1}
          className="mb-4"
        />

        {/* Tick marks */}
        <div className="flex justify-between px-1">
          {ticks.map((tick) => (
            <button
              key={tick}
              onClick={() => onChange(tick)}
              className={`text-xs transition-colors ${
                value === tick
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tick}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-muted-foreground text-sm">
        Between 8 and 200
      </div>
    </div>
  )
}
