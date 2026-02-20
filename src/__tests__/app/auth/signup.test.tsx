import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignUpPage from '@/app/auth/signup/page'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock sonner toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
}
jest.mock('sonner', () => ({
  toast: mockToast,
}))

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
  },
}

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => mockSupabaseClient),
}))

describe('SignUp Page', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockToast.success.mockClear()
    mockToast.error.mockClear()

    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Default successful signup response
    mockSupabaseClient.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
      error: null,
    })
  })

  describe('Page Rendering', () => {
    it('should render sign up form with all fields', () => {
      render(<SignUpPage />)

      expect(screen.getByRole('heading', { name: /join cricketbid/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()

      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    })

    it('should have proper form structure and labels', () => {
      render(<SignUpPage />)

      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()

      // Check for proper labeling
      expect(screen.getByDisplayValue('')).toBeInTheDocument() // Empty inputs
      expect(screen.getByText('Enter your information to get started')).toBeInTheDocument()
    })

    it('should show link to sign in page', () => {
      render(<SignUpPage />)

      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeInTheDocument()
      expect(signInLink).toHaveAttribute('href', '/auth/signin')
    })
  })

  describe('Form Validation', () => {
    it('should show error for empty name field', async () => {
      render(<SignUpPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      })

      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })

    it('should show error for empty email field', async () => {
      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })

      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })

    it('should show error for short password', async () => {
      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, '123')
      await user.type(confirmPasswordInput, '123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
      })

      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })

    it('should show error for mismatched passwords', async () => {
      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'different123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
      })

      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      render(<SignUpPage />)

      const passwordInput = screen.getByLabelText(/^password/i)
      const toggleButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('svg') // Find the eye icon button
      )

      expect(passwordInput).toHaveAttribute('type', 'password')

      await user.click(toggleButton!)
      expect(passwordInput).toHaveAttribute('type', 'text')

      await user.click(toggleButton!)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should toggle confirm password visibility', async () => {
      render(<SignUpPage />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const toggleButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg') // Find the eye icon buttons
      )
      const confirmToggle = toggleButtons[1] // Second toggle button

      expect(confirmPasswordInput).toHaveAttribute('type', 'password')

      await user.click(confirmToggle!)
      expect(confirmPasswordInput).toHaveAttribute('type', 'text')

      await user.click(confirmToggle!)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Successful Sign Up', () => {
    it('should handle successful sign up with email verification', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user-123' }, session: null }, // No session means email verification required
        error: null,
      })

      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: {
            data: { name: 'John Doe' },
            emailRedirectTo: `${location.origin}/auth/callback`
          }
        })
      })

      expect(screen.getByText('Please check your email for a verification link before signing in.')).toBeInTheDocument()
    })

    it('should handle successful sign up with immediate session', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: 'user-123' },
          session: { access_token: 'token' }
        },
        error: null,
      })

      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Account created successfully!')
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Error Handling', () => {
    it('should display Supabase auth errors', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      })

      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument()
      })
    })

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.auth.signUp.mockRejectedValue(new Error('Network error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should handle missing Supabase configuration', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'your-project-url'

      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Authentication service is not available')).toBeInTheDocument()
      })
    })
  })

  describe('Google Sign Up', () => {
    it('should initiate Google OAuth sign up', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: {},
        error: null,
      })

      render(<SignUpPage />)

      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await user.click(googleButton)

      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/auth/callback`
        }
      })
    })

    it('should handle Google OAuth errors', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: {},
        error: { message: 'OAuth error' },
      })

      render(<SignUpPage />)

      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText('OAuth error')).toBeInTheDocument()
      })
    })

    it('should handle Google OAuth network errors', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockRejectedValue(new Error('Network error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      render(<SignUpPage />)

      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to sign up with Google')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('should handle missing Supabase for Google OAuth', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'your-project-url'

      render(<SignUpPage />)

      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await user.click(googleButton)

      await waitFor(() => {
        expect(screen.getByText('Authentication service is not available')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      mockSupabaseClient.auth.signUp.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { user: null }, error: null }), 100))
      )

      render(<SignUpPage />)

      const nameInput = screen.getByLabelText(/full name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create account/i })

      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.click(submitButton)

      expect(screen.getByText('Creating account...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('should disable buttons during Google OAuth', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
      )

      render(<SignUpPage />)

      const googleButton = screen.getByRole('button', { name: /continue with google/i })
      await user.click(googleButton)

      expect(googleButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labeling', () => {
      render(<SignUpPage />)

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<SignUpPage />)

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('should have accessible form validation', async () => {
      render(<SignUpPage />)

      const submitButton = screen.getByRole('button', { name: /create account/i })
      await user.click(submitButton)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
      })
    })
  })
})