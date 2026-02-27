import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  PermissionGate,
  PermissionButton,
  RoleBasedRender,
  PermissionAlert,
  OwnerOnly,
  MemberOrAbove,
} from '@/components/organizations/PermissionGate'
import type { OrganizationRole } from '@/lib/types'

describe('PermissionGate Component', () => {
  const TestContent = () => <div data-testid="test-content">Protected Content</div>
  const FallbackContent = () => <div data-testid="fallback-content">Fallback Content</div>

  describe('Basic Role Checks', () => {
    it('should render children when user has required role (OWNER)', () => {
      render(
        <PermissionGate userRole="OWNER" requiredRole="OWNER">
          <TestContent />
        </PermissionGate>
      )
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should render children when OWNER accesses MEMBER-required content', () => {
      render(
        <PermissionGate userRole="OWNER" requiredRole="MEMBER">
          <TestContent />
        </PermissionGate>
      )
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should not render children when MEMBER tries to access OWNER-required content', () => {
      render(
        <PermissionGate userRole="MEMBER" requiredRole="OWNER">
          <TestContent />
        </PermissionGate>
      )
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })

    it('should render children when MEMBER accesses MEMBER-required content', () => {
      render(
        <PermissionGate userRole="MEMBER" requiredRole="MEMBER">
          <TestContent />
        </PermissionGate>
      )
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should render fallback when user lacks required role', () => {
      render(
        <PermissionGate userRole="MEMBER" requiredRole="OWNER" fallback={<FallbackContent />}>
          <TestContent />
        </PermissionGate>
      )
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
    })

    it('should handle null user role', () => {
      render(
        <PermissionGate userRole={null} requiredRole="MEMBER">
          <TestContent />
        </PermissionGate>
      )
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })

    it('should handle undefined user role', () => {
      render(
        <PermissionGate userRole={undefined} requiredRole="OWNER">
          <TestContent />
        </PermissionGate>
      )
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('should show error message when showError=true and user lacks required role', () => {
      render(
        <PermissionGate userRole="MEMBER" requiredRole="OWNER" showError={true}>
          <TestContent />
        </PermissionGate>
      )
      expect(screen.getByText("You don't have permission to view this content.")).toBeInTheDocument()
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })

    it('should show custom error message', () => {
      render(
        <PermissionGate userRole="MEMBER" requiredRole="OWNER" showError={true} errorMessage="Custom error">
          <TestContent />
        </PermissionGate>
      )
      expect(screen.getByText('Custom error')).toBeInTheDocument()
    })

    it('should not show error when user has required role', () => {
      render(
        <PermissionGate userRole="OWNER" requiredRole="OWNER" showError={true}>
          <TestContent />
        </PermissionGate>
      )
      expect(screen.queryByText("You don't have permission to view this content.")).not.toBeInTheDocument()
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })

  describe('No Required Role Specified', () => {
    it('should allow access when no requiredRole is specified', () => {
      render(
        <PermissionGate userRole="MEMBER">
          <TestContent />
        </PermissionGate>
      )
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should allow access for null role when no requiredRole is specified', () => {
      render(
        <PermissionGate userRole={null}>
          <TestContent />
        </PermissionGate>
      )
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })
})

describe('PermissionButton Component', () => {
  const TestButton = () => <button data-testid="test-button">Action Button</button>
  const FallbackButton = () => <button data-testid="fallback-button" disabled>Disabled Button</button>

  it('should render button when user has required role', () => {
    render(
      <PermissionButton userRole="OWNER" requiredRole="OWNER">
        <TestButton />
      </PermissionButton>
    )
    expect(screen.getByTestId('test-button')).toBeInTheDocument()
  })

  it('should render button when OWNER accesses MEMBER-required action', () => {
    render(
      <PermissionButton userRole="OWNER" requiredRole="MEMBER">
        <TestButton />
      </PermissionButton>
    )
    expect(screen.getByTestId('test-button')).toBeInTheDocument()
  })

  it('should render fallback when user lacks required role', () => {
    render(
      <PermissionButton userRole="MEMBER" requiredRole="OWNER" fallback={<FallbackButton />}>
        <TestButton />
      </PermissionButton>
    )
    expect(screen.queryByTestId('test-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback-button')).toBeInTheDocument()
  })

  it('should render button when no requiredRole is specified', () => {
    render(
      <PermissionButton userRole="MEMBER">
        <TestButton />
      </PermissionButton>
    )
    expect(screen.getByTestId('test-button')).toBeInTheDocument()
  })
})

describe('RoleBasedRender Component', () => {
  const OwnerContent = () => <div data-testid="owner-content">Owner Content</div>
  const MemberContent = () => <div data-testid="member-content">Member Content</div>
  const FallbackContentEl = () => <div data-testid="fallback-content">Fallback Content</div>

  it('should render owner content for OWNER role', () => {
    render(
      <RoleBasedRender userRole="OWNER" ownerContent={<OwnerContent />} memberContent={<MemberContent />} />
    )
    expect(screen.getByTestId('owner-content')).toBeInTheDocument()
    expect(screen.queryByTestId('member-content')).not.toBeInTheDocument()
  })

  it('should render member content for MEMBER role', () => {
    render(
      <RoleBasedRender userRole="MEMBER" ownerContent={<OwnerContent />} memberContent={<MemberContent />} />
    )
    expect(screen.getByTestId('member-content')).toBeInTheDocument()
    expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument()
  })

  it('should fall back to member content when owner content not provided for OWNER', () => {
    render(
      <RoleBasedRender userRole="OWNER" memberContent={<MemberContent />} />
    )
    expect(screen.getByTestId('member-content')).toBeInTheDocument()
  })

  it('should render fallback for null role', () => {
    render(
      <RoleBasedRender userRole={null} ownerContent={<OwnerContent />} fallback={<FallbackContentEl />} />
    )
    expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
    expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument()
  })

  it('should render fallback for MEMBER when only owner content provided', () => {
    render(
      <RoleBasedRender userRole="MEMBER" ownerContent={<OwnerContent />} fallback={<FallbackContentEl />} />
    )
    expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
    expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument()
  })
})

describe('PermissionAlert Component', () => {
  it('should display permission alert with correct role and action', () => {
    render(
      <PermissionAlert userRole="MEMBER" requiredRole="OWNER" action="manage team settings" />
    )
    expect(screen.getByText('OWNER role required')).toBeInTheDocument()
    expect(screen.getByText(/to manage team settings/)).toBeInTheDocument()
    expect(screen.getByText(/Your current role:/)).toBeInTheDocument()
    expect(screen.getByText('MEMBER')).toBeInTheDocument()
  })

  it('should display alert without current role when user role is null', () => {
    render(
      <PermissionAlert userRole={null} requiredRole="OWNER" action="delete organization" />
    )
    expect(screen.getByText('OWNER role required')).toBeInTheDocument()
    expect(screen.getByText(/to delete organization/)).toBeInTheDocument()
    expect(screen.queryByText(/Your current role:/)).not.toBeInTheDocument()
  })

  it('should accept custom className', () => {
    const { container } = render(
      <PermissionAlert userRole="MEMBER" requiredRole="OWNER" action="test action" className="custom-class" />
    )
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })
})

describe('Utility Permission Components', () => {
  const TestContent = () => <div data-testid="protected-content">Protected Content</div>
  const FallbackContent = () => <div data-testid="fallback-content">Not Authorized</div>

  describe('OwnerOnly', () => {
    it('should render children for OWNER role', () => {
      render(<OwnerOnly userRole="OWNER"><TestContent /></OwnerOnly>)
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should not render children for MEMBER role', () => {
      render(<OwnerOnly userRole="MEMBER"><TestContent /></OwnerOnly>)
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should render fallback for MEMBER role when fallback provided', () => {
      render(<OwnerOnly userRole="MEMBER" fallback={<FallbackContent />}><TestContent /></OwnerOnly>)
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
    })

    it('should not render children for null role', () => {
      render(<OwnerOnly userRole={null}><TestContent /></OwnerOnly>)
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('MemberOrAbove', () => {
    it('should render children for OWNER role', () => {
      render(<MemberOrAbove userRole="OWNER"><TestContent /></MemberOrAbove>)
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render children for MEMBER role', () => {
      render(<MemberOrAbove userRole="MEMBER"><TestContent /></MemberOrAbove>)
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should not render children for null role', () => {
      render(<MemberOrAbove userRole={null}><TestContent /></MemberOrAbove>)
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should render fallback for null role when fallback provided', () => {
      render(<MemberOrAbove userRole={null} fallback={<FallbackContent />}><TestContent /></MemberOrAbove>)
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
    })
  })
})

describe('Edge Cases', () => {
  const TestContent = () => <div data-testid="test-content">Content</div>

  it('should handle invalid role gracefully', () => {
    render(
      <PermissionGate userRole={'INVALID_ROLE' as OrganizationRole} requiredRole="OWNER">
        <TestContent />
      </PermissionGate>
    )
    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
  })

  it('should handle missing children gracefully', () => {
    expect(() => {
      render(
        <PermissionGate userRole="OWNER" requiredRole="OWNER">
          {null}
        </PermissionGate>
      )
    }).not.toThrow()
  })
})
