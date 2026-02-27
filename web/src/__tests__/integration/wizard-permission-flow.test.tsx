import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { renderHook, act } from '@testing-library/react'
import { useWizardForm } from '@/hooks/useWizardForm'
import { PermissionGate } from '@/components/organizations/PermissionGate'
import { isOwner, isMember } from '@/lib/permissions'
import { validateStep, validateBudgetConstraints, basicInfoSchema } from '@/lib/validations/auction'
import { OrganizationRole } from '@/lib/types'

describe('Integration: Wizard Form + Permission System', () => {
  describe('Permission-based Wizard Access', () => {
    it('should allow auction creation for OWNER role', () => {
      const TestComponent = ({ userRole }: { userRole: OrganizationRole }) => (
        <PermissionGate userRole={userRole} requiredRole="OWNER">
          <div data-testid="create-auction-wizard">Create Auction Wizard</div>
        </PermissionGate>
      )

      const { rerender } = render(<TestComponent userRole="OWNER" />)
      expect(screen.getByTestId('create-auction-wizard')).toBeInTheDocument()

      rerender(<TestComponent userRole="MEMBER" />)
      expect(screen.queryByTestId('create-auction-wizard')).not.toBeInTheDocument()
    })

    it('should validate permission requirements for different roles', () => {
      expect(isOwner('OWNER')).toBe(true)
      expect(isOwner('MEMBER')).toBe(false)

      expect(isMember('OWNER')).toBe(true)
      expect(isMember('MEMBER')).toBe(true)

      expect(isOwner(null)).toBe(false)
      expect(isOwner(undefined)).toBe(false)
      expect(isMember(null)).toBe(false)
      expect(isMember(undefined)).toBe(false)
    })
  })

  describe('Wizard Form Flow with Validation', () => {
    it('should complete a full wizard flow with form updates', async () => {
      const { result } = renderHook(() => useWizardForm())

      // Step 1: Basic Info
      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'Integration Test Auction',
          visibility: 'PUBLIC',
        })
      })

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

      // Step 3: Initialize teams
      act(() => {
        result.current.initializeTeams(result.current.formState.config.numTeams!)
      })

      expect(result.current.formState.teams).toHaveLength(4)
      expect(result.current.formState.teams?.[0].name).toBe('Team 1')

      // Step 4: Initialize tiers
      act(() => {
        result.current.initializeTiers()
      })

      expect(result.current.formState.tiers).toBeDefined()

      // Verify form state is complete
      expect(result.current.formState.basicInfo.name).toBe('Integration Test Auction')
      expect(result.current.formState.config.budgetPerTeam).toBe(1000)
      expect(result.current.formState.teams).toHaveLength(4)
    })

    it('should handle validation errors and prevent progression', async () => {
      const { result } = renderHook(() => useWizardForm())

      const invalidBasicInfo = {
        name: 'AB', // Too short
      }

      act(() => {
        result.current.updateSection('basicInfo', invalidBasicInfo)
      })

      const validation = validateStep(invalidBasicInfo, basicInfoSchema)
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toMatchObject({
        name: expect.arrayContaining([expect.stringContaining('at least 3 characters')]),
      })
    })

    it('should validate budget constraints integration', () => {
      const config = {
        budgetPerTeam: 1000,
        currencyName: 'Coins',
        currencyIcon: '🪙',
        squadSize: 11,
        numTeams: 4,
        biddingType: 'SEALED_TENDER' as const,
      }

      const tiers = [
        { name: 'Platinum', basePrice: 200, color: '#E5E4E2', minPerTeam: 1, maxPerTeam: 2 },
        { name: 'Gold', basePrice: 100, color: '#FFD700', minPerTeam: 2, maxPerTeam: 4 },
        { name: 'Silver', basePrice: 50, color: '#C0C0C0', minPerTeam: 3, maxPerTeam: 5 },
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
    it('should enforce different access based on user role', () => {
      const roles: OrganizationRole[] = ['OWNER', 'MEMBER']

      roles.forEach(role => {
        if (role === 'OWNER') {
          expect(isOwner(role)).toBe(true)
          expect(isMember(role)).toBe(true)
        } else if (role === 'MEMBER') {
          expect(isOwner(role)).toBe(false)
          expect(isMember(role)).toBe(true)
        }
      })
    })

    it('should conditionally show/hide wizard features based on role', () => {
      const WizardFeature: React.FC<{ userRole: OrganizationRole }> = ({ userRole }) => (
        <div>
          <PermissionGate userRole={userRole} requiredRole="MEMBER">
            <div data-testid="basic-auction-access">Basic Auction Access</div>
          </PermissionGate>
          <PermissionGate userRole={userRole} requiredRole="OWNER">
            <div data-testid="owner-features">Owner Features</div>
          </PermissionGate>
        </div>
      )

      const { rerender } = render(<WizardFeature userRole="OWNER" />)
      expect(screen.getByTestId('basic-auction-access')).toBeInTheDocument()
      expect(screen.getByTestId('owner-features')).toBeInTheDocument()

      rerender(<WizardFeature userRole="MEMBER" />)
      expect(screen.getByTestId('basic-auction-access')).toBeInTheDocument()
      expect(screen.queryByTestId('owner-features')).not.toBeInTheDocument()
    })
  })

  describe('Complete Auction Creation Flow', () => {
    it('should simulate complete auction creation with permission checks', async () => {
      const userRole: OrganizationRole = 'OWNER'
      expect(isOwner(userRole)).toBe(true)

      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'Championship Auction 2024',
          description: 'Annual championship cricket auction',
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
          { name: 'International', basePrice: 300, color: '#FFD700', minPerTeam: 1, maxPerTeam: 3 },
          { name: 'Domestic', basePrice: 150, color: '#C0C0C0', minPerTeam: 4, maxPerTeam: 8 },
          { name: 'Emerging', basePrice: 75, color: '#CD7F32', minPerTeam: 4, maxPerTeam: 8 },
        ])
      })

      const budgetValidation = validateBudgetConstraints(
        result.current.formState.config as any,
        result.current.formState.tiers as any
      )
      expect(budgetValidation.isValid).toBe(true)

      expect(result.current.formState.basicInfo.name).toBe('Championship Auction 2024')
      expect(result.current.formState.config?.budgetPerTeam).toBe(2000)
      expect(result.current.formState.teams).toHaveLength(8)
      expect(result.current.formState.tiers).toHaveLength(3)
    })

    it('should handle permission denied scenarios gracefully', () => {
      const PermissionDeniedFlow = ({ userRole }: { userRole: OrganizationRole }) => (
        <div>
          <PermissionGate
            userRole={userRole}
            requiredRole="OWNER"
            showError={true}
            errorMessage="You need Owner role to create auctions"
            fallback={<div data-testid="permission-denied">Permission denied</div>}
          >
            <div data-testid="auction-wizard">Auction Creation Wizard</div>
          </PermissionGate>
        </div>
      )

      render(<PermissionDeniedFlow userRole="MEMBER" />)
      expect(screen.queryByTestId('auction-wizard')).not.toBeInTheDocument()
      expect(screen.getByText('You need Owner role to create auctions')).toBeInTheDocument()
    })
  })

  describe('Error Recovery and Validation Integration', () => {
    it('should recover from validation errors and continue wizard flow', async () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'X', // Too short
        })
      })

      const validation1 = validateStep(result.current.formState.basicInfo, basicInfoSchema)
      expect(validation1.isValid).toBe(false)

      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'Valid Auction Name',
          visibility: 'PUBLIC',
        })
      })

      const validation2 = validateStep(result.current.formState.basicInfo, basicInfoSchema)
      expect(validation2.isValid).toBe(true)
      expect(result.current.formState.basicInfo.name).toBe('Valid Auction Name')
    })

    it('should maintain form state consistency across validation failures', async () => {
      const { result } = renderHook(() => useWizardForm())

      act(() => {
        result.current.updateSection('basicInfo', {
          name: 'Test Auction',
          visibility: 'PUBLIC',
        })
      })

      act(() => {
        result.current.updateSection('config', {
          budgetPerTeam: 100, // Too low for the tiers below
          currencyName: 'Coins',
          currencyIcon: '🪙',
          squadSize: 11,
          numTeams: 4,
        })
      })

      act(() => {
        result.current.initializeTiers([
          { name: 'Premium', basePrice: 50, color: '#FFD700', minPerTeam: 3, maxPerTeam: 5 },
          { name: 'Standard', basePrice: 30, color: '#C0C0C0', minPerTeam: 8, maxPerTeam: 10 },
        ])
      })

      const budgetValidation = validateBudgetConstraints(
        result.current.formState.config as any,
        result.current.formState.tiers as any
      )

      expect(budgetValidation.isValid).toBe(false)
      expect(budgetValidation.warnings).toContainEqual(
        expect.stringContaining('exceed team budget')
      )

      // Basic info should remain intact despite budget validation failure
      expect(result.current.formState.basicInfo.name).toBe('Test Auction')
      expect(result.current.formState.config?.budgetPerTeam).toBe(100)
    })
  })
})
