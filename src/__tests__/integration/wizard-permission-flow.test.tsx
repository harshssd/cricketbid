import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { useWizardForm } from '@/hooks/useWizardForm'
import { PermissionGate } from '@/components/organizations/PermissionGate'
import { Permission, hasPermission, getPermissionsForRole } from '@/lib/permissions'
import { validateStep, validateBudgetConstraints, basicInfoSchema } from '@/lib/validations/auction'
import { OrganizationRole } from '@/lib/types'

// Mock localStorage for wizard form tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Integration: Wizard Form + Permission System', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    localStorageMock.clear.mockClear()
  })

  describe('Permission-based Wizard Access', () => {
    it('should allow auction creation for users with CREATE_AUCTIONS permission', () => {
      const TestComponent = ({ userRole }: { userRole: OrganizationRole }) => (
        <PermissionGate userRole={userRole} permission={Permission.CREATE_AUCTIONS}>
          <div data-testid="create-auction-wizard">Create Auction Wizard</div>
        </PermissionGate>
      )

      // Test different roles
      const { rerender } = render(<TestComponent userRole="OWNER" />)
      expect(screen.getByTestId('create-auction-wizard')).toBeInTheDocument()

      rerender(<TestComponent userRole="ADMIN" />)
      expect(screen.getByTestId('create-auction-wizard')).toBeInTheDocument()

      rerender(<TestComponent userRole="MODERATOR" />)
      expect(screen.getByTestId('create-auction-wizard')).toBeInTheDocument()

      rerender(<TestComponent userRole="MEMBER" />)
      expect(screen.queryByTestId('create-auction-wizard')).not.toBeInTheDocument()
    })

    it('should validate permission requirements for different auction settings', () => {
      // Test role hierarchy and permissions
      expect(hasPermission('OWNER', Permission.DELETE_AUCTIONS)).toBe(true)
      expect(hasPermission('ADMIN', Permission.DELETE_AUCTIONS)).toBe(true)
      expect(hasPermission('MODERATOR', Permission.DELETE_AUCTIONS)).toBe(false)
      expect(hasPermission('MEMBER', Permission.DELETE_AUCTIONS)).toBe(false)

      // Advanced auction features should require higher permissions
      expect(hasPermission('OWNER', Permission.MANAGE_BILLING)).toBe(true)
      expect(hasPermission('ADMIN', Permission.MANAGE_BILLING)).toBe(false)
    })
  })

  describe('Wizard Form Flow with Validation', () => {
    it('should complete a full wizard flow with form persistence', async () => {
      const { result } = renderHook(() => useWizardForm())

      // Step 1: Basic Info
      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'Integration Test Auction',
          scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
          timezone: 'UTC',
          visibility: 'PUBLIC',
        })
      })

      // Verify auto-save happened
      expect(localStorageMock.setItem).toHaveBeenCalled()

      // Step 2: Configuration
      act(() => {
        result.current.updateSection('config', {
          budgetPerTeam: 1000,
          currencyName: 'Coins',
          currencyIcon: '🪙',
          squadSize: 11,
          numTeams: 4,
        })
      })

      // Step 3: Initialize teams based on configuration
      act(() => {
        result.current.initializeTeams(result.current.formState.config.numTeams)
      })

      expect(result.current.formState.teams).toHaveLength(4)
      expect(result.current.formState.teams?.[0].name).toBe('Team 1')

      // Step 4: Initialize tiers
      act(() => {
        result.current.initializeTiers()
      })

      expect(result.current.formState.tiers?.length).toBeGreaterThan(0)

      // Verify form state is complete
      expect(result.current.formState.basicInfo.name).toBe('Integration Test Auction')
      expect(result.current.formState.config.budgetPerTeam).toBe(1000)
      expect(result.current.formState.teams).toHaveLength(4)
    })

    it('should handle validation errors and prevent progression', async () => {
      const { result } = renderHook(() => useWizardForm())

      // Try to proceed without required basic info
      const invalidBasicInfo = {
        name: 'AB', // Too short
        scheduledAt: new Date(Date.now() - 86400000), // In the past
        timezone: '', // Empty
      }

      act(() => {
        result.current.updateSection('basicInfo', invalidBasicInfo)
      })

      // Validate using the validation schema
      const validation = validateStep(invalidBasicInfo, basicInfoSchema)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toMatchObject({
        'name': expect.arrayContaining([expect.stringContaining('at least 3 characters')]),
        'scheduledAt': expect.arrayContaining([expect.stringContaining('future')]),
        'timezone': expect.arrayContaining([expect.stringContaining('select a timezone')]),
      })
    })

    it('should validate budget constraints integration', () => {
      const config = {
        budgetPerTeam: 1000,
        currencyName: 'Coins',
        currencyIcon: '🪙',
        squadSize: 11,
        numTeams: 4,
        tiersVisible: 'ORGANIZERS_ONLY' as const,
        bidAmountsVisible: 'HIDDEN' as const,
        showPlayerStats: true,
        allowBidComments: false,
        enableNominations: false,
      }

      const tiers = [
        {
          name: 'Platinum',
          basePrice: 200,
          color: '#E5E4E2',
          minPerTeam: 1,
          maxPerTeam: 2,
        },
        {
          name: 'Gold',
          basePrice: 100,
          color: '#FFD700',
          minPerTeam: 2,
          maxPerTeam: 4,
        },
        {
          name: 'Silver',
          basePrice: 50,
          color: '#C0C0C0',
          minPerTeam: 3,
          maxPerTeam: 5,
        },
      ]

      const validation = validateBudgetConstraints(config, tiers)

      expect(validation.isValid).toBe(true)
      expect(validation.flexibility).toBeGreaterThan(0)
      expect(validation.warnings).toBeDefined()

      // Total minimum cost: (200*1) + (100*2) + (50*3) = 550
      // Flexibility: ((1000-550)/1000)*100 = 45%
      expect(validation.flexibility).toBeCloseTo(45, 0)
    })
  })

  describe('Permission System Integration with Validation', () => {
    it('should enforce different validation rules based on user role', () => {
      const roles: OrganizationRole[] = ['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER']

      roles.forEach(role => {
        const permissions = getPermissionsForRole(role)

        // Higher roles should have more permissions
        if (role === 'OWNER') {
          expect(permissions).toContain(Permission.DELETE_ORGANIZATION)
          expect(permissions).toContain(Permission.MANAGE_BILLING)
        } else if (role === 'ADMIN') {
          expect(permissions).not.toContain(Permission.DELETE_ORGANIZATION)
          expect(permissions).toContain(Permission.CREATE_AUCTIONS)
        } else if (role === 'MODERATOR') {
          expect(permissions).toContain(Permission.CREATE_AUCTIONS)
          expect(permissions).not.toContain(Permission.DELETE_AUCTIONS)
        } else if (role === 'MEMBER') {
          expect(permissions).toContain(Permission.PARTICIPATE_IN_AUCTIONS)
          expect(permissions).not.toContain(Permission.CREATE_AUCTIONS)
        }
      })
    })

    it('should conditionally show/hide wizard features based on permissions', () => {
      interface WizardFeatureProps {
        userRole: OrganizationRole
        showAdvancedFeatures: boolean
      }

      const WizardFeature: React.FC<WizardFeatureProps> = ({ userRole, showAdvancedFeatures }) => (
        <div>
          <PermissionGate userRole={userRole} permission={Permission.CREATE_AUCTIONS}>
            <div data-testid="basic-auction-creation">Basic Auction Creation</div>
          </PermissionGate>

          <PermissionGate userRole={userRole} permission={Permission.MODERATE_AUCTIONS}>
            <div data-testid="moderation-features">Moderation Features</div>
          </PermissionGate>

          <PermissionGate userRole={userRole} permission={Permission.MANAGE_BILLING}>
            <div data-testid="billing-features">Billing Features</div>
          </PermissionGate>

          {showAdvancedFeatures && (
            <PermissionGate
              userRole={userRole}
              permissions={[Permission.CREATE_AUCTIONS, Permission.MODERATE_AUCTIONS]}
              requireAll={true}
            >
              <div data-testid="advanced-auction-features">Advanced Auction Features</div>
            </PermissionGate>
          )}
        </div>
      )

      // Test OWNER role - should see everything
      const { rerender } = render(<WizardFeature userRole="OWNER" showAdvancedFeatures={true} />)
      expect(screen.getByTestId('basic-auction-creation')).toBeInTheDocument()
      expect(screen.getByTestId('moderation-features')).toBeInTheDocument()
      expect(screen.getByTestId('billing-features')).toBeInTheDocument()
      expect(screen.getByTestId('advanced-auction-features')).toBeInTheDocument()

      // Test ADMIN role - should see most features but not billing
      rerender(<WizardFeature userRole="ADMIN" showAdvancedFeatures={true} />)
      expect(screen.getByTestId('basic-auction-creation')).toBeInTheDocument()
      expect(screen.getByTestId('moderation-features')).toBeInTheDocument()
      expect(screen.queryByTestId('billing-features')).not.toBeInTheDocument()
      expect(screen.getByTestId('advanced-auction-features')).toBeInTheDocument()

      // Test MODERATOR role - should see creation and moderation but not billing
      rerender(<WizardFeature userRole="MODERATOR" showAdvancedFeatures={true} />)
      expect(screen.getByTestId('basic-auction-creation')).toBeInTheDocument()
      expect(screen.getByTestId('moderation-features')).toBeInTheDocument()
      expect(screen.queryByTestId('billing-features')).not.toBeInTheDocument()
      expect(screen.getByTestId('advanced-auction-features')).toBeInTheDocument()

      // Test MEMBER role - should only see basic participation
      rerender(<WizardFeature userRole="MEMBER" showAdvancedFeatures={true} />)
      expect(screen.queryByTestId('basic-auction-creation')).not.toBeInTheDocument()
      expect(screen.queryByTestId('moderation-features')).not.toBeInTheDocument()
      expect(screen.queryByTestId('billing-features')).not.toBeInTheDocument()
      expect(screen.queryByTestId('advanced-auction-features')).not.toBeInTheDocument()
    })
  })

  describe('Complete Auction Creation Flow', () => {
    it('should simulate complete auction creation with permission checks', async () => {
      // Simulate a user with appropriate permissions
      const userRole: OrganizationRole = 'ADMIN'

      // Verify user can create auctions
      expect(hasPermission(userRole, Permission.CREATE_AUCTIONS)).toBe(true)

      const { result } = renderHook(() => useWizardForm())

      // Complete form step by step
      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'Championship Auction 2024',
          description: 'Annual championship cricket auction',
          scheduledAt: new Date('2024-12-01T10:00:00Z'),
          timezone: 'UTC',
          visibility: 'PUBLIC',
        })
      })

      act(() => {
        result.current.updateSection('config', {
          budgetPerTeam: 2000,
          currencyName: 'Credits',
          currencyIcon: '💰',
          squadSize: 15,
          numTeams: 8,
        })
      })

      act(() => {
        result.current.initializeTeams(8)
      })

      act(() => {
        result.current.initializeTiers([
          {
            name: 'International',
            basePrice: 300,
            color: '#FFD700',
            minPerTeam: 1,
            maxPerTeam: 3,
          },
          {
            name: 'Domestic',
            basePrice: 150,
            color: '#C0C0C0',
            minPerTeam: 4,
            maxPerTeam: 8,
          },
          {
            name: 'Emerging',
            basePrice: 75,
            color: '#CD7F32',
            minPerTeam: 4,
            maxPerTeam: 8,
          },
        ])
      })

      act(() => {
        result.current.updateSection('branding', {
          primaryColor: '#1B2A4A',
          secondaryColor: '#3B82F6',
          font: 'Inter',
          tagline: 'Championship Cricket Auction 2024',
        })
      })

      // Validate budget constraints
      const budgetValidation = validateBudgetConstraints(
        result.current.formState.config!,
        result.current.formState.tiers!
      )

      expect(budgetValidation.isValid).toBe(true)

      // Verify form is complete and ready for submission
      expect(result.current.formState.basicInfo.name).toBe('Championship Auction 2024')
      expect(result.current.formState.config?.budgetPerTeam).toBe(2000)
      expect(result.current.formState.teams).toHaveLength(8)
      expect(result.current.formState.tiers).toHaveLength(3)
      expect(result.current.formState.branding?.primaryColor).toBe('#1B2A4A')

      // Verify auto-save occurred throughout the process
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(5) // 5 form updates
    })

    it('should handle permission denied scenarios gracefully', () => {
      const PermissionDeniedFlow = ({ userRole }: { userRole: OrganizationRole }) => (
        <div>
          <PermissionGate
            userRole={userRole}
            permission={Permission.CREATE_AUCTIONS}
            showError={true}
            errorMessage="You need at least Moderator role to create auctions"
            fallback={
              <div data-testid="permission-denied">
                Permission denied - Cannot create auctions
              </div>
            }
          >
            <div data-testid="auction-wizard">Auction Creation Wizard</div>
          </PermissionGate>
        </div>
      )

      // Test with MEMBER role (should be denied)
      render(<PermissionDeniedFlow userRole="MEMBER" />)

      expect(screen.queryByTestId('auction-wizard')).not.toBeInTheDocument()
      expect(screen.getByText('You need at least Moderator role to create auctions')).toBeInTheDocument()
    })
  })

  describe('Error Recovery and Validation Integration', () => {
    it('should recover from validation errors and continue wizard flow', async () => {
      const { result } = renderHook(() => useWizardForm())

      // Start with invalid data
      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'X', // Too short
          scheduledAt: new Date('2020-01-01'), // In the past
          timezone: '', // Empty
        })
      })

      // Validate and expect errors
      const validation1 = validateStep(result.current.formState.basicInfo, basicInfoSchema)
      expect(validation1.isValid).toBe(false)

      // Fix the validation errors
      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'Valid Auction Name',
          scheduledAt: new Date(Date.now() + 86400000), // Tomorrow
          timezone: 'UTC',
          visibility: 'PUBLIC',
        })
      })

      // Validate again and expect success
      const validation2 = validateStep(result.current.formState.basicInfo, basicInfoSchema)
      expect(validation2.isValid).toBe(true)

      // Verify form progression is now possible
      expect(result.current.formState.basicInfo.name).toBe('Valid Auction Name')
    })

    it('should maintain form state consistency across validation failures', async () => {
      const { result } = renderHook(() => useWizardForm())

      // Set valid basic info
      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'Test Auction',
          scheduledAt: new Date(Date.now() + 86400000),
          timezone: 'UTC',
        })
      })

      // Set invalid config that would fail budget validation
      act(() => {
        result.current.updateSection('config', {
          budgetPerTeam: 100, // Too low
          currencyName: 'Coins',
          currencyIcon: '🪙',
          squadSize: 11,
          numTeams: 4,
        })
      })

      // Set tiers that would exceed budget
      const expensiveTiers = [
        {
          name: 'Premium',
          basePrice: 50,
          color: '#FFD700',
          minPerTeam: 3, // 3 * 50 = 150 per team already exceeds budget
          maxPerTeam: 5,
        },
        {
          name: 'Standard',
          basePrice: 30,
          color: '#C0C0C0',
          minPerTeam: 8, // 8 * 30 = 240, total would be 390 > 100 budget
          maxPerTeam: 10,
        },
      ]

      act(() => {
        result.current.updateSection('tiers', expensiveTiers)
      })

      // Validate budget constraints
      const budgetValidation = validateBudgetConstraints(
        result.current.formState.config!,
        result.current.formState.tiers!
      )

      expect(budgetValidation.isValid).toBe(false)
      expect(budgetValidation.warnings).toContainEqual(
        expect.stringContaining('exceed team budget')
      )

      // Verify that basic info remains intact despite budget validation failure
      expect(result.current.formState.basicInfo.name).toBe('Test Auction')
      expect(result.current.formState.config?.budgetPerTeam).toBe(100) // Invalid value preserved
    })
  })
})