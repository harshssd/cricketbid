'use client'

import { motion } from 'framer-motion'

interface TeamCountQuestionProps {
  value: number
  onChange: (value: number) => void
}

export function TeamCountQuestion({ value, onChange }: TeamCountQuestionProps) {
  const min = 2
  const max = 12

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <label className="block text-lg font-medium text-muted-foreground mb-6">
          Number of teams
        </label>

        <div className="flex flex-wrap justify-center gap-3">
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => (
            <motion.button
              key={n}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(n)}
              className={`w-12 h-12 rounded-full text-lg font-bold transition-colors ${
                n <= value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="text-center text-muted-foreground text-sm">
        Between {min} and {max} teams
      </div>
    </div>
  )
}
