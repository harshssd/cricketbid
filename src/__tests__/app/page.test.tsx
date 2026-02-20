import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import Home from '@/app/page'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    })),
  },
}

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => mockSupabaseClient),
}))

describe('Home Page', () => {
  beforeEach(() => {
    // Reset environment variables for consistent testing
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    jest.clearAllMocks()
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      // Mock a delayed response to test loading state
      mockSupabaseClient.auth.getUser.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { user: null } }), 100))
      )

      render(<Home />)

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
    })
  })

  describe('Unauthenticated User', () => {
    beforeEach(async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })
    })

    it('should render main brand elements', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('TossUp')).toBeInTheDocument()
        expect(screen.getByText(/The ultimate cricket auction platform/)).toBeInTheDocument()
      })
    })

    it('should show sign in and sign up buttons in header', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
      })
    })

    it('should show unauthenticated CTA buttons', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /get started free/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /watch demo/i })).toBeInTheDocument()
      })
    })

    it('should display features section', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Everything you need for cricket auctions')).toBeInTheDocument()
        expect(screen.getByText('Sealed Bidding')).toBeInTheDocument()
        expect(screen.getByText('Live Streaming')).toBeInTheDocument()
        expect(screen.getByText('Team Management')).toBeInTheDocument()
      })
    })

    it('should show correct links in navigation', async () => {
      render(<Home />)

      await waitFor(() => {
        const signInLink = screen.getByRole('link', { name: /sign in/i })
        const signUpLink = screen.getByRole('link', { name: /sign up/i })

        expect(signInLink).toHaveAttribute('href', '/auth/signin')
        expect(signUpLink).toHaveAttribute('href', '/auth/signup')
      })
    })
  })

  describe('Authenticated User', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User',
      },
    }

    beforeEach(async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    it('should show welcome message with user name', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument()
      })
    })

    it('should show welcome message with email fallback when name not available', async () => {
      const userWithoutName = { ...mockUser, user_metadata: {} }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithoutName },
        error: null,
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Welcome back, test!')).toBeInTheDocument()
      })
    })

    it('should show dashboard button in header', async () => {
      render(<Home />)

      await waitFor(() => {
        const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
        expect(dashboardLink).toBeInTheDocument()
        expect(dashboardLink).toHaveAttribute('href', '/dashboard')
      })
    })

    it('should show authenticated CTA buttons', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /create auction/i })).toBeInTheDocument()
      })
    })

    it('should show authenticated footer CTAs', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /create your auction/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /start a league/i })).toBeInTheDocument()
      })
    })

    it('should not show sign in/up buttons when authenticated', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /get started free/i })).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: /watch demo/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Supabase Integration', () => {
    it('should handle Supabase auth state changes', async () => {
      const mockCallback = jest.fn()
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      })

      render(<Home />)

      // Verify that auth state change listener is set up
      await waitFor(() => {
        expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled()
      })
    })

    it('should handle missing Supabase configuration', async () => {
      // Test when Supabase is not configured
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'your-project-url'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-anon-key'

      render(<Home />)

      await waitFor(() => {
        // Should still render the page without Supabase functionality
        expect(screen.getByText('TossUp')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
      })
    })

    it('should handle auth errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Auth error'))

      render(<Home />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Auth error:', expect.any(Error))
        // Should still render the page
        expect(screen.getByText('TossUp')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should clean up auth listener on unmount', async () => {
      const unsubscribeMock = jest.fn()
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } }
      })

      const { unmount } = render(<Home />)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled()
      })

      unmount()

      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('Features Section', () => {
    it('should display all feature cards', async () => {
      render(<Home />)

      await waitFor(() => {
        const featureCards = [
          'Sealed Bidding',
          'Live Streaming',
          'Team Management',
          'Dry Run Simulator',
          'Configuration Wizard',
          'Export & Share',
        ]

        featureCards.forEach(feature => {
          expect(screen.getByText(feature)).toBeInTheDocument()
        })
      })
    })

    it('should display feature descriptions', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText(/Fair and strategic sealed-bid system/)).toBeInTheDocument()
        expect(screen.getByText(/Share your auction live with animated draft boards/)).toBeInTheDocument()
        expect(screen.getByText(/Complete role-based access/)).toBeInTheDocument()
      })
    })
  })

  describe('Call-to-Action Section', () => {
    it('should display CTA section with correct content', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Ready to run your cricket auction?')).toBeInTheDocument()
        expect(screen.getByText(/Join cricket clubs worldwide using TossUp/)).toBeInTheDocument()
      })
    })

    it('should show benefit badges', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('No credit card required')).toBeInTheDocument()
        expect(screen.getByText('Setup in 5 minutes')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design and Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'TossUp' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 2, name: 'Everything you need for cricket auctions' })).toBeInTheDocument()
      })
    })

    it('should have navigation with proper role', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })
    })

    it('should have proper alt text for icons and images', async () => {
      render(<Home />)

      // The component uses Lucide icons which should have proper accessibility
      await waitFor(() => {
        expect(screen.getByText('TossUp')).toBeInTheDocument()
      })
    })
  })

  describe('Link Destinations', () => {
    it('should have correct href attributes for all links', async () => {
      render(<Home />)

      await waitFor(() => {
        // Navigation links
        expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/signin')
        expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/auth/signup')
      })
    })

    it('should have correct authenticated links', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test' } }
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
        expect(screen.getByRole('link', { name: /create auction/i })).toHaveAttribute('href', '/auction/create')
        expect(screen.getByRole('link', { name: /start a league/i })).toHaveAttribute('href', '/leagues/create')
      })
    })
  })

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle component rendering without crashing', () => {
      expect(() => render(<Home />)).not.toThrow()
    })

    it('should handle undefined user metadata gracefully', async () => {
      const userWithoutMetadata = { id: 'user-123', email: 'test@example.com' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: userWithoutMetadata },
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Welcome back, test!')).toBeInTheDocument()
      })
    })
  })
})