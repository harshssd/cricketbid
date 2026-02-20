import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface TeamBudgetQuestionProps {
  value: number
  onChange: (value: number) => void
}

export function TeamBudgetQuestion({ value, onChange }: TeamBudgetQuestionProps) {
  const [inputValue, setInputValue] = useState(value.toString())

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Only update parent if it's a valid number
    const numValue = parseInt(newValue)
    if (!isNaN(numValue) && numValue > 0) {
      onChange(numValue)
    }
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select()
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <label className="block text-lg font-medium text-gray-300 mb-4">
          Starting coins per team
        </label>

        <div className="relative">
          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onClick={handleInputClick}
            placeholder="e.g| 600"
            min="100"
            max="10000"
            className="w-full h-16 text-2xl text-center bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
              onClick={() => {
                const newVal = Math.max(100, value - 50)
                setInputValue(newVal.toString())
                onChange(newVal)
              }}
            >
              ▼
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-gray-400 text-sm">
        Between 100 and 10,000 coins
      </div>
    </div>
  )
}