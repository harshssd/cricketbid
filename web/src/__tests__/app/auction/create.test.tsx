import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import CreateAuctionPage from '@/app/auction/create/page'

// Mock next/navigation
const mockPush = jest.fn()
const mockGet = jest.fn().mockReturnValue('league-123')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}))

// Mock framer-motion to render children directly
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...filterMotionProps(props)}>{children}</div>,
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <span {...filterMotionProps(props)}>{children}</span>,
    button: ({ children, onClick, className, ...props }: React.PropsWithChildren<{ onClick?: () => void; className?: string } & Record<string, unknown>>) => (
      <button onClick={onClick} className={className} {...filterMotionProps(props)}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

// Filter out motion-specific props that would cause React warnings
function filterMotionProps(props: Record<string, unknown>) {
  const filtered: Record<string, unknown> = {}
  const motionKeys = ['variants', 'initial', 'animate', 'exit', 'transition', 'custom', 'whileHover', 'whileTap', 'mode', 'layout']
  for (const [key, value] of Object.entries(props)) {
    if (!motionKeys.includes(key)) {
      filtered[key] = value
    }
  }
  return filtered
}

// Mock PageTransition
jest.mock('@/components/PageTransition', () => ({
  PageTransition: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))

// Mock Slider (Radix UI needs ResizeObserver which is reset by jest's resetMocks)
jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step, className }: {
    value: number[]; onValueChange: (v: number[]) => void; min: number; max: number; step: number; className?: string
  }) => (
    <input
      type="range"
      data-testid="mock-slider"
      value={value[0]}
      min={min}
      max={max}
      step={step}
      className={className}
      onChange={(e) => onValueChange([Number(e.target.value)])}
    />
  ),
}))

// Mock outcry-utils
jest.mock('@/lib/outcry-utils', () => ({
  getDefaultOutcryConfig: () => ({
    rules: [
      { from_multiplier: 0, to_multiplier: 2, increment: 10 },
    ],
    timer_seconds: 15,
  }),
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('CreateAuctionPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockReturnValue('league-123')
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'auction-123' }),
    })
  })

  describe('Initial Rendering', () => {
    it('should render the page with title', () => {
      render(<CreateAuctionPage />)

      expect(screen.getByRole('heading', { name: 'Create Auction' })).toBeInTheDocument()
      expect(screen.getByText(/Configure your cricket auction/)).toBeInTheDocument()
    })

    it('should render auction name input', () => {
      render(<CreateAuctionPage />)

      expect(screen.getByPlaceholderText('e.g. Summer Cricket Championship')).toBeInTheDocument()
    })

    it('should render bidding format section', () => {
      render(<CreateAuctionPage />)

      expect(screen.getByText('Bidding Format')).toBeInTheDocument()
      expect(screen.getByText('Sealed Tender')).toBeInTheDocument()
      expect(screen.getByText('Open Outcry (IPL Style)')).toBeInTheDocument()
    })

    it('should render player pool, teams, and budget sections', () => {
      render(<CreateAuctionPage />)

      expect(screen.getByText('Player Pool')).toBeInTheDocument()
      expect(screen.getByText('Teams')).toBeInTheDocument()
      expect(screen.getByText('Budget')).toBeInTheDocument()
    })

    it('should have Create Auction button disabled initially', () => {
      render(<CreateAuctionPage />)

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      expect(createButton).toBeDisabled()
    })
  })

  describe('Auction Name Input', () => {
    it('should enable Create Auction button when name has 3+ characters', async () => {
      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Test Auction')

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      expect(createButton).not.toBeDisabled()
    })

    it('should keep Create Auction button disabled when name is too short', async () => {
      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Ab')

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      expect(createButton).toBeDisabled()
    })

    it('should show character count warning for short names', async () => {
      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Ab')

      expect(screen.getByText('At least 3 characters')).toBeInTheDocument()
    })

    it('should show character count', async () => {
      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Test')

      expect(screen.getByText('4/50')).toBeInTheDocument()
    })
  })

  describe('Bidding Type Selection', () => {
    it('should default to Sealed Tender', () => {
      render(<CreateAuctionPage />)

      // Bottom bar should show Sealed Tender
      expect(screen.getByText(/Sealed Tender/i, { selector: '.text-sm.text-muted-foreground span, .text-sm.text-muted-foreground, p' })).toBeInTheDocument()
    })

    it('should switch to Open Outcry when selected', async () => {
      render(<CreateAuctionPage />)

      const outcryButton = screen.getByText('Open Outcry (IPL Style)').closest('button')!
      await user.click(outcryButton)

      // Timer config should appear
      expect(screen.getByText('Bid Timer')).toBeInTheDocument()
    })
  })

  describe('Preset Buttons', () => {
    it('should have player pool preset buttons', () => {
      render(<CreateAuctionPage />)

      expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '50' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '150' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '200' })).toBeInTheDocument()
    })

    it('should have budget preset buttons', () => {
      render(<CreateAuctionPage />)

      expect(screen.getByRole('button', { name: '300' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '600' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '1,000' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2,000' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '5,000' })).toBeInTheDocument()
    })

    it('should have team count buttons from 2 to 12', () => {
      render(<CreateAuctionPage />)

      for (let i = 2; i <= 12; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument()
      }
    })
  })

  describe('Auction Creation', () => {
    it('should submit auction and redirect on success', async () => {
      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Test Auction')

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auction/create', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }))
        expect(mockPush).toHaveBeenCalledWith('/auction/auction-123')
      })
    })

    it('should include correct payload in API call', async () => {
      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'My Auction')

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
        const callArgs = mockFetch.mock.calls[0]
        const body = JSON.parse(callArgs[1].body)
        expect(body.basicInfo.name).toBe('My Auction')
        expect(body.leagueId).toBe('league-123')
        expect(body.config.biddingType).toBe('SEALED_TENDER')
        expect(body.teams).toHaveLength(4) // Default team count
        expect(body.tiers).toHaveLength(4)
      })
    })

    it('should show alert when no league is selected', async () => {
      mockGet.mockReturnValue(null)
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Test Auction')

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      await user.click(createButton)

      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('No league selected'))
      expect(mockFetch).not.toHaveBeenCalled()

      alertSpy.mockRestore()
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      })
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Test Auction')

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Validation failed'))
      })

      alertSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Test Auction')

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to create auction:', expect.any(Error))
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Network error'))
      })

      alertSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('should show Creating... while submitting', async () => {
      // Make fetch hang
      mockFetch.mockReturnValue(new Promise(() => {}))

      render(<CreateAuctionPage />)

      const input = screen.getByPlaceholderText('e.g. Summer Cricket Championship')
      await user.type(input, 'Test Auction')

      const createButton = screen.getByRole('button', { name: /Create Auction/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Creating.../i })).toBeDisabled()
      })
    })
  })

  describe('Bottom Summary Bar', () => {
    it('should show default summary stats', () => {
      render(<CreateAuctionPage />)

      // Default: 4 teams, 50 players, 600 coins each
      const summary = screen.getByText(/teams.*players|players.*teams/i)
        ?? screen.getByText(/coins each/i)
      expect(screen.getByText(/coins each/)).toBeInTheDocument()
    })
  })
})
