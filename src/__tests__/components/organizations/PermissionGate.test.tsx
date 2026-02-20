import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  PermissionGate,
  PermissionButton,
  RoleBasedRender,
  PermissionAlert,
  CanInviteMembers,
  CanManageMembers,
  CanCreateAuctions,
  CanManageOrganization,
  AdminOnly,
} from '@/components/organizations/PermissionGate'
import { Permission } from '@/lib/permissions'
import { OrganizationRole } from '@/lib/types'

describe('PermissionGate Component', () => {
  const TestContent = () => <div data-testid="test-content">Protected Content</div>
  const FallbackContent = () => <div data-testid="fallback-content">Fallback Content</div>

  describe('Basic Permission Checks', () => {
    it('should render children when user has required permission', () => {
      render(
        <PermissionGate userRole="OWNER" permission={Permission.CREATE_AUCTIONS}>
          <TestContent />
        </PermissionGate>
      )

      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should not render children when user lacks required permission', () => {
      render(
        <PermissionGate userRole="MEMBER" permission={Permission.CREATE_AUCTIONS}>
          <TestContent />
        </PermissionGate>
      )

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })

    it('should render fallback when user lacks permission', () => {
      render(
        <PermissionGate
          userRole="MEMBER"
          permission={Permission.CREATE_AUCTIONS}
          fallback={<FallbackContent />}
        >
          <TestContent />
        </PermissionGate>
      )

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
    })

    it('should handle null user role', () => {
      render(
        <PermissionGate userRole={null} permission={Permission.CREATE_AUCTIONS}>
          <TestContent />
        </PermissionGate>
      )

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })

    it('should handle undefined user role', () => {
      render(
        <PermissionGate userRole={undefined} permission={Permission.CREATE_AUCTIONS}>
          <TestContent />
        </PermissionGate>
      )

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })
  })

  describe('Multiple Permission Checks', () => {
    const permissions = [Permission.CREATE_AUCTIONS, Permission.DELETE_AUCTIONS]

    it('should render when user has ANY of the required permissions (requireAll=false)', () => {
      render(
        <PermissionGate
          userRole="MODERATOR"
          permissions={permissions}
          requireAll={false}
        >
          <TestContent />
        </PermissionGate>
      )

      // MODERATOR has CREATE_AUCTIONS but not DELETE_AUCTIONS
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should not render when user has ALL required permissions (requireAll=true)', () => {
      render(
        <PermissionGate
          userRole="MODERATOR"
          permissions={permissions}
          requireAll={true}
        >
          <TestContent />
        </PermissionGate>
      )

      // MODERATOR has CREATE_AUCTIONS but not DELETE_AUCTIONS
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })

    it('should render when user has ALL required permissions (requireAll=true)', () => {
      render(
        <PermissionGate
          userRole="OWNER"
          permissions={permissions}
          requireAll={true}
        >
          <TestContent />
        </PermissionGate>
      )

      // OWNER has both permissions
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should not render when user has NONE of the required permissions', () => {
      render(
        <PermissionGate
          userRole="MEMBER"
          permissions={permissions}
          requireAll={false}
        >
          <TestContent />
        </PermissionGate>
      )

      // MEMBER has neither permission
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('should show error message when showError=true and user lacks permission', () => {
      render(
        <PermissionGate
          userRole="MEMBER"
          permission={Permission.CREATE_AUCTIONS}
          showError={true}
        >
          <TestContent />
        </PermissionGate>
      )

      expect(screen.getByText("You don't have permission to view this content.")).toBeInTheDocument()
      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
    })

    it('should show custom error message', () => {
      const customMessage = "Custom permission error message"

      render(
        <PermissionGate
          userRole="MEMBER"
          permission={Permission.CREATE_AUCTIONS}
          showError={true}
          errorMessage={customMessage}
        >
          <TestContent />
        </PermissionGate>
      )

      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it('should not show error when user has permission', () => {
      render(
        <PermissionGate
          userRole="OWNER"
          permission={Permission.CREATE_AUCTIONS}
          showError={true}
        >
          <TestContent />
        </PermissionGate>
      )

      expect(screen.queryByText("You don't have permission to view this content.")).not.toBeInTheDocument()
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })

  describe('No Permission Specified', () => {
    it('should allow access when no permission is specified', () => {
      render(
        <PermissionGate userRole="MEMBER">
          <TestContent />
        </PermissionGate>
      )

      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should allow access when empty permissions array is provided', () => {
      render(
        <PermissionGate userRole="MEMBER" permissions={[]}>
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

  it('should render button when user has permission', () => {
    render(
      <PermissionButton userRole="ADMIN" permission={Permission.INVITE_MEMBERS}>
        <TestButton />
      </PermissionButton>
    )

    expect(screen.getByTestId('test-button')).toBeInTheDocument()
  })

  it('should render fallback when user lacks permission', () => {
    render(
      <PermissionButton
        userRole="MEMBER"
        permission={Permission.INVITE_MEMBERS}
        fallback={<FallbackButton />}
      >
        <TestButton />
      </PermissionButton>
    )

    expect(screen.queryByTestId('test-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('fallback-button')).toBeInTheDocument()
  })

  it('should handle multiple permissions correctly', () => {
    render(
      <PermissionButton
        userRole="ADMIN"
        permissions={[Permission.INVITE_MEMBERS, Permission.REMOVE_MEMBERS]}
        requireAll={true}
      >
        <TestButton />
      </PermissionButton>
    )

    // ADMIN has both permissions
    expect(screen.getByTestId('test-button')).toBeInTheDocument()
  })
})

describe('RoleBasedRender Component', () => {
  const OwnerContent = () => <div data-testid="owner-content">Owner Content</div>
  const AdminContent = () => <div data-testid="admin-content">Admin Content</div>
  const ModeratorContent = () => <div data-testid="moderator-content">Moderator Content</div>
  const MemberContent = () => <div data-testid="member-content">Member Content</div>
  const FallbackContent = () => <div data-testid="fallback-content">Fallback Content</div>

  it('should render owner content for OWNER role', () => {
    render(
      <RoleBasedRender
        userRole="OWNER"
        ownerContent={<OwnerContent />}
        adminContent={<AdminContent />}
        memberContent={<MemberContent />}
      />
    )

    expect(screen.getByTestId('owner-content')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument()
  })

  it('should render admin content for ADMIN role', () => {
    render(
      <RoleBasedRender
        userRole="ADMIN"
        ownerContent={<OwnerContent />}
        adminContent={<AdminContent />}
        memberContent={<MemberContent />}
      />
    )

    expect(screen.getByTestId('admin-content')).toBeInTheDocument()
    expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument()
  })

  it('should fall back to lower role content when specific content not provided', () => {
    render(
      <RoleBasedRender
        userRole="OWNER"
        adminContent={<AdminContent />}
        memberContent={<MemberContent />}
      />
    )

    // OWNER should fall back to admin content since owner content not provided
    expect(screen.getByTestId('admin-content')).toBeInTheDocument()
  })

  it('should render fallback for null role', () => {
    render(
      <RoleBasedRender
        userRole={null}
        ownerContent={<OwnerContent />}
        fallback={<FallbackContent />}
      />
    )

    expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
    expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument()
  })

  it('should handle role hierarchy fallback correctly', () => {
    render(
      <RoleBasedRender
        userRole="MODERATOR"
        memberContent={<MemberContent />}
        fallback={<FallbackContent />}
      />
    )

    // MODERATOR should fall back to member content
    expect(screen.getByTestId('member-content')).toBeInTheDocument()
  })
})

describe('PermissionAlert Component', () => {
  it('should display permission alert with correct role and action', () => {
    render(
      <PermissionAlert
        userRole="MEMBER"
        requiredRole="ADMIN"
        action="manage team settings"
      />
    )

    expect(screen.getByText('ADMIN role required')).toBeInTheDocument()
    expect(screen.getByText(/to manage team settings/)).toBeInTheDocument()
    expect(screen.getByText(/Your current role: MEMBER/)).toBeInTheDocument()
  })

  it('should display alert without current role when user role is null', () => {
    render(
      <PermissionAlert
        userRole={null}
        requiredRole="OWNER"
        action="delete organization"
      />
    )

    expect(screen.getByText('OWNER role required')).toBeInTheDocument()
    expect(screen.getByText(/to delete organization/)).toBeInTheDocument()
    expect(screen.queryByText(/Your current role:/)).not.toBeInTheDocument()
  })

  it('should apply correct styling based on required role', () => {
    const { container } = render(
      <PermissionAlert
        userRole="MEMBER"
        requiredRole="OWNER"
        action="test action"
      />
    )

    // Should have yellow styling for OWNER role
    expect(container.querySelector('.text-yellow-700')).toBeInTheDocument()
  })
})

describe('Utility Permission Components', () => {
  const TestContent = () => <div data-testid="protected-content">Protected Content</div>
  const FallbackContent = () => <div data-testid="fallback-content">Not Authorized</div>

  describe('CanInviteMembers', () => {
    it('should render children for users who can invite members', () => {
      render(
        <CanInviteMembers userRole="ADMIN">
          <TestContent />
        </CanInviteMembers>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render fallback for users who cannot invite members', () => {
      render(
        <CanInviteMembers userRole="MEMBER" fallback={<FallbackContent />}>
          <TestContent />
        </CanInviteMembers>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument()
    })
  })

  describe('CanManageMembers', () => {
    it('should render children for users who can manage members', () => {
      render(
        <CanManageMembers userRole="OWNER">
          <TestContent />
        </CanManageMembers>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should not render children for users who cannot manage members', () => {
      render(
        <CanManageMembers userRole="MODERATOR">
          <TestContent />
        </CanManageMembers>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('CanCreateAuctions', () => {
    it('should render children for users who can create auctions', () => {
      render(
        <CanCreateAuctions userRole="MODERATOR">
          <TestContent />
        </CanCreateAuctions>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should not render children for users who cannot create auctions', () => {
      render(
        <CanCreateAuctions userRole="MEMBER">
          <TestContent />
        </CanCreateAuctions>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('CanManageOrganization', () => {
    it('should render children for users who can manage organization', () => {
      render(
        <CanManageOrganization userRole="OWNER">
          <TestContent />
        </CanManageOrganization>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should not render children for users who cannot manage organization', () => {
      render(
        <CanManageOrganization userRole="ADMIN">
          <TestContent />
        </CanManageOrganization>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  describe('AdminOnly', () => {
    it('should render children for OWNER (admin-level permissions)', () => {
      render(
        <AdminOnly userRole="OWNER">
          <TestContent />
        </AdminOnly>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should render children for ADMIN', () => {
      render(
        <AdminOnly userRole="ADMIN">
          <TestContent />
        </AdminOnly>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should not render children for MODERATOR', () => {
      render(
        <AdminOnly userRole="MODERATOR">
          <TestContent />
        </AdminOnly>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })

    it('should not render children for MEMBER', () => {
      render(
        <AdminOnly userRole="MEMBER">
          <TestContent />
        </AdminOnly>
      )

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })
})

describe('Edge Cases and Error Handling', () => {
  const TestContent = () => <div data-testid="test-content">Content</div>

  it('should handle invalid role gracefully', () => {
    render(
      <PermissionGate userRole={'INVALID_ROLE' as OrganizationRole} permission={Permission.CREATE_AUCTIONS}>
        <TestContent />
      </PermissionGate>
    )

    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
  })

  it('should handle missing children gracefully', () => {
    expect(() => {
      render(
        <PermissionGate userRole="OWNER" permission={Permission.CREATE_AUCTIONS}>
          {null}
        </PermissionGate>
      )
    }).not.toThrow()
  })

  it('should handle complex permission combinations', () => {
    // Test with multiple permissions where user has some but not all
    render(
      <PermissionGate
        userRole="ADMIN"
        permissions={[
          Permission.CREATE_AUCTIONS,
          Permission.VIEW_ANALYTICS,
          Permission.DELETE_ORGANIZATION, // ADMIN doesn't have this
        ]}
        requireAll={true}
      >
        <TestContent />
      </PermissionGate>
    )

    expect(screen.queryByTestId('test-content')).not.toBeInTheDocument()
  })

  it('should prioritize single permission over permissions array', () => {
    render(
      <PermissionGate
        userRole="MEMBER"
        permission={Permission.VIEW_ORGANIZATION} // MEMBER has this
        permissions={[Permission.CREATE_AUCTIONS]} // MEMBER doesn't have this
      >
        <TestContent />
      </PermissionGate>
    )

    // Should use single permission (which MEMBER has)
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })
})