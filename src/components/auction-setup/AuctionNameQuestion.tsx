import { Input } from '@/components/ui/input'

interface AuctionNameQuestionProps {
  value: string
  onChange: (value: string) => void
}

export function AuctionNameQuestion({ value, onChange }: AuctionNameQuestionProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select()
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <label className="block text-lg font-medium text-muted-foreground mb-4">
          Auction name
        </label>

        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          onClick={handleInputClick}
          placeholder="e.g| Summer Cricket Championship"
          maxLength={50}
          className="w-full h-16 text-2xl text-center rounded-lg"
        />
      </div>

      <div className="text-center text-muted-foreground text-sm">
        {value.length}/50 characters
        {value.length < 3 && <div className="text-orange-400 mt-1">At least 3 characters required</div>}
      </div>
    </div>
  )
}
