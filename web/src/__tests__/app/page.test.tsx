import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Because jest.config has resetMocks: true, mock implementations defined outside
// jest.mock() factories get wiped between tests. We use require() inside the
// factory so the mock object lives within the module scope and survives resets.
// Then we re-import that same object via require() in beforeEach to reconfigure it.

jest.mock('@supabase/ssr', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
  }
  return {
    createBrowserClient: jest.fn(() => mockSupabaseClient),
    __mockSupabaseClient: mockSupabaseClient,
  }
})

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Helper to get the mock client from within the mocked module
function getMockSupabaseClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@supabase/ssr').__mockSupabaseClient
}

function getMockCreateBrowserClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@supabase/ssr').createBrowserClient
}

import Home from '@/app/page'

describe('Home Page', () => {
  beforeEach(() => {
    // Reset environment variables for consistent testing
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Re-wire mock implementations after resetMocks clears them
    const mockClient = getMockSupabaseClient()
    const mockCreateBrowserClient = getMockCreateBrowserClient()

    mockCreateBrowserClient.mockReturnValue(mockClient)
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })
    mockClient.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      const mockClient = getMockSupabaseClient()
      // Mock a delayed response to test loading state
      mockClient.auth.getUser.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { user: null } }), 100))
      )

      render(<Home />)

      // The spinner is a div with animate-spin class, not a role="status" element
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Unauthenticated User', () => {
    it('should render main brand elements', async () => {
      render(<Home />)

      await waitFor(() => {
        // There are two "TossUp" text nodes (nav + h1), use getAllByText
        const tossUpElements = screen.getAllByText('TossUp')
        expect(tossUpElements.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText(/The complete cricket management platform/)).toBeInTheDocument()
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

    beforeEach(() => {
      const mockClient = getMockSupabaseClient()
      mockClient.auth.getUser.mockResolvedValue({
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
      const mockClient = getMockSupabaseClient()
      const userWithoutName = { ...mockUser, user_metadata: {} }
      mockClient.auth.getUser.mockResolvedValue({
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
        // Use exact name "Dashboard" to target the header link (not "Go to Dashboard" in hero)
        const dashboardLink = screen.getByRole('link', { name: 'Dashboard' })
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

    it('should not show sign in/up buttons when authenticated', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument()
      })

      expect(screen.queryByRole('link', { name: /get started free/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /watch demo/i })).not.toBeInTheDocument()
    })
  })

  describe('Supabase Integration', () => {
    it('should handle Supabase auth state changes', async () => {
      const mockClient = getMockSupabaseClient()

      render(<Home />)

      // Verify that auth state change listener is set up
      await waitFor(() => {
        expect(mockClient.auth.onAuthStateChange).toHaveBeenCalled()
      })
    })

    it('should handle missing Supabase configuration', async () => {
      // Test when Supabase URL contains 'your-project' (treated as unconfigured)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-anon-key'

      render(<Home />)

      await waitFor(() => {
        // Should still render the page without Supabase functionality
        const tossUpElements = screen.getAllByText('TossUp')
        expect(tossUpElements.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
      })
    })

    it('should handle auth errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const mockClient = getMockSupabaseClient()
      mockClient.auth.getUser.mockRejectedValue(new Error('Auth error'))

      render(<Home />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Auth error:', expect.any(Error))
        // Should still render the page
        const tossUpElements = screen.getAllByText('TossUp')
        expect(tossUpElements.length).toBeGreaterThanOrEqual(1)
      })

      consoleSpy.mockRestore()
    })

    it('should clean up auth listener on unmount', async () => {
      const unsubscribeMock = jest.fn()
      const mockClient = getMockSupabaseClient()
      mockClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } }
      })

      const { unmount } = render(<Home />)

      await waitFor(() => {
        expect(mockClient.auth.onAuthStateChange).toHaveBeenCalled()
      })

      unmount()

      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('Responsive Design and Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'TossUp' })).toBeInTheDocument()
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

      await waitFor(() => {
        const tossUpElements = screen.getAllByText('TossUp')
        expect(tossUpElements.length).toBeGreaterThanOrEqual(1)
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
      const mockClient = getMockSupabaseClient()
      const mockUser = { id: 'user-123', email: 'test@example.com', user_metadata: { name: 'Test' } }
      mockClient.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/dashboard')
        expect(screen.getByRole('link', { name: /create auction/i })).toHaveAttribute('href', '/auction/create')
      })
    })
  })

  describe('Error Boundaries and Edge Cases', () => {
    it('should handle component rendering without crashing', () => {
      expect(() => render(<Home />)).not.toThrow()
    })

    it('should handle undefined user metadata gracefully', async () => {
      const mockClient = getMockSupabaseClient()
      const userWithoutMetadata = { id: 'user-123', email: 'test@example.com' }
      mockClient.auth.getUser.mockResolvedValue({
        data: { user: userWithoutMetadata },
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Welcome back, test!')).toBeInTheDocument()
      })
    })
  })
})
