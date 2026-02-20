import {
  Permission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  canManageRole,
  canRemoveMember,
  getRoleLevel,
  hasHigherPrivilege,
  getAssignableRoles,
  usePermissions,
} from '@/lib/permissions'
import { OrganizationRole } from '@/lib/types'
import { renderHook } from '@testing-library/react'

describe('Permission System', () => {
  describe('hasPermission', () => {
    it('should return false for null or undefined role', () => {
      expect(hasPermission(null, Permission.CREATE_AUCTIONS)).toBe(false)
      expect(hasPermission(undefined, Permission.CREATE_AUCTIONS)).toBe(false)
    })

    it('should return true for OWNER with any permission', () => {
      expect(hasPermission('OWNER', Permission.CREATE_AUCTIONS)).toBe(true)
      expect(hasPermission('OWNER', Permission.DELETE_ORGANIZATION)).toBe(true)
      expect(hasPermission('OWNER', Permission.MANAGE_BILLING)).toBe(true)
      expect(hasPermission('OWNER', Permission.PARTICIPATE_IN_AUCTIONS)).toBe(true)
    })

    it('should return correct permissions for ADMIN role', () => {
      // Should have these permissions
      expect(hasPermission('ADMIN', Permission.CREATE_AUCTIONS)).toBe(true)
      expect(hasPermission('ADMIN', Permission.INVITE_MEMBERS)).toBe(true)
      expect(hasPermission('ADMIN', Permission.MODERATE_AUCTIONS)).toBe(true)
      expect(hasPermission('ADMIN', Permission.VIEW_ANALYTICS)).toBe(true)

      // Should NOT have these permissions
      expect(hasPermission('ADMIN', Permission.DELETE_ORGANIZATION)).toBe(false)
      expect(hasPermission('ADMIN', Permission.MANAGE_BILLING)).toBe(false)
    })

    it('should return correct permissions for MODERATOR role', () => {
      // Should have these permissions
      expect(hasPermission('MODERATOR', Permission.CREATE_AUCTIONS)).toBe(true)
      expect(hasPermission('MODERATOR', Permission.MODERATE_AUCTIONS)).toBe(true)
      expect(hasPermission('MODERATOR', Permission.INVITE_MEMBERS)).toBe(true)

      // Should NOT have these permissions
      expect(hasPermission('MODERATOR', Permission.DELETE_AUCTIONS)).toBe(false)
      expect(hasPermission('MODERATOR', Permission.REMOVE_MEMBERS)).toBe(false)
      expect(hasPermission('MODERATOR', Permission.VIEW_ANALYTICS)).toBe(false)
    })

    it('should return correct permissions for MEMBER role', () => {
      // Should have these permissions
      expect(hasPermission('MEMBER', Permission.PARTICIPATE_IN_AUCTIONS)).toBe(true)
      expect(hasPermission('MEMBER', Permission.VIEW_ORGANIZATION)).toBe(true)
      expect(hasPermission('MEMBER', Permission.COMMENT_ON_AUCTIONS)).toBe(true)

      // Should NOT have these permissions
      expect(hasPermission('MEMBER', Permission.CREATE_AUCTIONS)).toBe(false)
      expect(hasPermission('MEMBER', Permission.INVITE_MEMBERS)).toBe(false)
      expect(hasPermission('MEMBER', Permission.MODERATE_AUCTIONS)).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return false for null or undefined role', () => {
      expect(hasAnyPermission(null, [Permission.CREATE_AUCTIONS, Permission.DELETE_AUCTIONS])).toBe(false)
      expect(hasAnyPermission(undefined, [Permission.CREATE_AUCTIONS])).toBe(false)
    })

    it('should return true if user has any of the specified permissions', () => {
      expect(hasAnyPermission('MODERATOR', [Permission.CREATE_AUCTIONS, Permission.DELETE_ORGANIZATION])).toBe(true)
      expect(hasAnyPermission('MEMBER', [Permission.PARTICIPATE_IN_AUCTIONS, Permission.CREATE_AUCTIONS])).toBe(true)
    })

    it('should return false if user has none of the specified permissions', () => {
      expect(hasAnyPermission('MEMBER', [Permission.CREATE_AUCTIONS, Permission.DELETE_AUCTIONS])).toBe(false)
      expect(hasAnyPermission('MODERATOR', [Permission.DELETE_ORGANIZATION, Permission.MANAGE_BILLING])).toBe(false)
    })

    it('should handle empty permissions array', () => {
      expect(hasAnyPermission('OWNER', [])).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return false for null or undefined role', () => {
      expect(hasAllPermissions(null, [Permission.CREATE_AUCTIONS])).toBe(false)
      expect(hasAllPermissions(undefined, [Permission.CREATE_AUCTIONS])).toBe(false)
    })

    it('should return true if user has all specified permissions', () => {
      expect(hasAllPermissions('OWNER', [Permission.CREATE_AUCTIONS, Permission.DELETE_AUCTIONS])).toBe(true)
      expect(hasAllPermissions('ADMIN', [Permission.CREATE_AUCTIONS, Permission.VIEW_ANALYTICS])).toBe(true)
      expect(hasAllPermissions('MEMBER', [Permission.PARTICIPATE_IN_AUCTIONS, Permission.VIEW_ORGANIZATION])).toBe(true)
    })

    it('should return false if user lacks any of the specified permissions', () => {
      expect(hasAllPermissions('MODERATOR', [Permission.CREATE_AUCTIONS, Permission.DELETE_AUCTIONS])).toBe(false)
      expect(hasAllPermissions('MEMBER', [Permission.PARTICIPATE_IN_AUCTIONS, Permission.CREATE_AUCTIONS])).toBe(false)
    })

    it('should handle empty permissions array', () => {
      expect(hasAllPermissions('OWNER', [])).toBe(true)
    })
  })

  describe('getPermissionsForRole', () => {
    it('should return all permissions for OWNER', () => {
      const permissions = getPermissionsForRole('OWNER')
      expect(permissions).toContain(Permission.DELETE_ORGANIZATION)
      expect(permissions).toContain(Permission.MANAGE_BILLING)
      expect(permissions).toContain(Permission.CREATE_AUCTIONS)
      expect(permissions).toContain(Permission.PARTICIPATE_IN_AUCTIONS)
      expect(permissions.length).toBeGreaterThan(15) // OWNER should have all permissions
    })

    it('should return correct permissions for each role', () => {
      const adminPermissions = getPermissionsForRole('ADMIN')
      const moderatorPermissions = getPermissionsForRole('MODERATOR')
      const memberPermissions = getPermissionsForRole('MEMBER')

      expect(adminPermissions.length).toBeGreaterThan(moderatorPermissions.length)
      expect(moderatorPermissions.length).toBeGreaterThan(memberPermissions.length)

      // ADMIN should not have owner-only permissions
      expect(adminPermissions).not.toContain(Permission.DELETE_ORGANIZATION)
      expect(adminPermissions).not.toContain(Permission.MANAGE_BILLING)

      // MEMBER should only have basic permissions
      expect(memberPermissions).toContain(Permission.PARTICIPATE_IN_AUCTIONS)
      expect(memberPermissions).toContain(Permission.VIEW_ORGANIZATION)
      expect(memberPermissions).not.toContain(Permission.CREATE_AUCTIONS)
    })
  })

  describe('canManageRole', () => {
    it('should return false for null or undefined manager role', () => {
      expect(canManageRole(null, 'MEMBER')).toBe(false)
      expect(canManageRole(undefined, 'MEMBER')).toBe(false)
    })

    it('should allow OWNER to manage all roles', () => {
      expect(canManageRole('OWNER', 'ADMIN')).toBe(true)
      expect(canManageRole('OWNER', 'MODERATOR')).toBe(true)
      expect(canManageRole('OWNER', 'MEMBER')).toBe(true)
    })

    it('should allow ADMIN to manage MODERATOR and MEMBER only', () => {
      expect(canManageRole('ADMIN', 'OWNER')).toBe(false)
      expect(canManageRole('ADMIN', 'ADMIN')).toBe(false)
      expect(canManageRole('ADMIN', 'MODERATOR')).toBe(true)
      expect(canManageRole('ADMIN', 'MEMBER')).toBe(true)
    })

    it('should not allow MODERATOR and MEMBER to manage any roles', () => {
      expect(canManageRole('MODERATOR', 'OWNER')).toBe(false)
      expect(canManageRole('MODERATOR', 'ADMIN')).toBe(false)
      expect(canManageRole('MODERATOR', 'MODERATOR')).toBe(false)
      expect(canManageRole('MODERATOR', 'MEMBER')).toBe(false)

      expect(canManageRole('MEMBER', 'OWNER')).toBe(false)
      expect(canManageRole('MEMBER', 'ADMIN')).toBe(false)
      expect(canManageRole('MEMBER', 'MODERATOR')).toBe(false)
      expect(canManageRole('MEMBER', 'MEMBER')).toBe(false)
    })
  })

  describe('canRemoveMember', () => {
    it('should return false for users without REMOVE_MEMBERS permission', () => {
      expect(canRemoveMember('MEMBER', 'MEMBER')).toBe(false)
      expect(canRemoveMember('MODERATOR', 'MEMBER')).toBe(false)
    })

    it('should return false for null or undefined remover role', () => {
      expect(canRemoveMember(null, 'MEMBER')).toBe(false)
      expect(canRemoveMember(undefined, 'MEMBER')).toBe(false)
    })

    it('should allow OWNER to remove non-owners', () => {
      expect(canRemoveMember('OWNER', 'ADMIN')).toBe(true)
      expect(canRemoveMember('OWNER', 'MODERATOR')).toBe(true)
      expect(canRemoveMember('OWNER', 'MEMBER')).toBe(true)
      expect(canRemoveMember('OWNER', 'OWNER')).toBe(false) // Cannot remove other owners
    })

    it('should allow ADMIN to remove MODERATOR and MEMBER only', () => {
      expect(canRemoveMember('ADMIN', 'OWNER')).toBe(false)
      expect(canRemoveMember('ADMIN', 'ADMIN')).toBe(false)
      expect(canRemoveMember('ADMIN', 'MODERATOR')).toBe(true)
      expect(canRemoveMember('ADMIN', 'MEMBER')).toBe(true)
    })
  })

  describe('getRoleLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(getRoleLevel('OWNER')).toBe(4)
      expect(getRoleLevel('ADMIN')).toBe(3)
      expect(getRoleLevel('MODERATOR')).toBe(2)
      expect(getRoleLevel('MEMBER')).toBe(1)
    })

    it('should return 0 for invalid role', () => {
      expect(getRoleLevel('INVALID' as OrganizationRole)).toBe(0)
    })
  })

  describe('hasHigherPrivilege', () => {
    it('should correctly compare role privileges', () => {
      expect(hasHigherPrivilege('OWNER', 'ADMIN')).toBe(true)
      expect(hasHigherPrivilege('ADMIN', 'MODERATOR')).toBe(true)
      expect(hasHigherPrivilege('MODERATOR', 'MEMBER')).toBe(true)

      expect(hasHigherPrivilege('MEMBER', 'MODERATOR')).toBe(false)
      expect(hasHigherPrivilege('MODERATOR', 'ADMIN')).toBe(false)
      expect(hasHigherPrivilege('ADMIN', 'OWNER')).toBe(false)

      expect(hasHigherPrivilege('ADMIN', 'ADMIN')).toBe(false) // Same level
    })
  })

  describe('getAssignableRoles', () => {
    it('should return empty array for null or undefined role', () => {
      expect(getAssignableRoles(null)).toEqual([])
      expect(getAssignableRoles(undefined)).toEqual([])
    })

    it('should return correct assignable roles for OWNER', () => {
      const assignable = getAssignableRoles('OWNER')
      expect(assignable).toContain('ADMIN')
      expect(assignable).toContain('MODERATOR')
      expect(assignable).toContain('MEMBER')
      expect(assignable).not.toContain('OWNER')
    })

    it('should return correct assignable roles for ADMIN', () => {
      const assignable = getAssignableRoles('ADMIN')
      expect(assignable).toContain('MODERATOR')
      expect(assignable).toContain('MEMBER')
      expect(assignable).not.toContain('OWNER')
      expect(assignable).not.toContain('ADMIN')
    })

    it('should return empty array for MODERATOR and MEMBER', () => {
      expect(getAssignableRoles('MODERATOR')).toEqual([])
      expect(getAssignableRoles('MEMBER')).toEqual([])
    })
  })

  describe('usePermissions hook', () => {
    it('should provide permission checking functions', () => {
      const { result } = renderHook(() => usePermissions('ADMIN'))

      expect(result.current.can(Permission.CREATE_AUCTIONS)).toBe(true)
      expect(result.current.can(Permission.DELETE_ORGANIZATION)).toBe(false)

      expect(result.current.canAny([Permission.CREATE_AUCTIONS, Permission.DELETE_ORGANIZATION])).toBe(true)
      expect(result.current.canAny([Permission.DELETE_ORGANIZATION, Permission.MANAGE_BILLING])).toBe(false)

      expect(result.current.canAll([Permission.CREATE_AUCTIONS, Permission.VIEW_ANALYTICS])).toBe(true)
      expect(result.current.canAll([Permission.CREATE_AUCTIONS, Permission.DELETE_ORGANIZATION])).toBe(false)
    })

    it('should provide role management functions', () => {
      const { result } = renderHook(() => usePermissions('OWNER'))

      expect(result.current.canManage('ADMIN')).toBe(true)
      expect(result.current.canRemove('MODERATOR')).toBe(true)

      const assignableRoles = result.current.getAssignableRoles()
      expect(assignableRoles).toContain('ADMIN')
      expect(assignableRoles).toContain('MODERATOR')
      expect(assignableRoles).toContain('MEMBER')
    })

    it('should provide role information', () => {
      const { result } = renderHook(() => usePermissions('MODERATOR'))

      expect(result.current.role).toBe('MODERATOR')
      expect(result.current.roleLevel).toBe(2)
    })

    it('should handle null/undefined role', () => {
      const { result } = renderHook(() => usePermissions(null))

      expect(result.current.can(Permission.CREATE_AUCTIONS)).toBe(false)
      expect(result.current.canManage('MEMBER')).toBe(false)
      expect(result.current.role).toBe(null)
      expect(result.current.roleLevel).toBe(0)
      expect(result.current.getAssignableRoles()).toEqual([])
    })
  })

  // Edge cases and error handling
  describe('Edge Cases', () => {
    it('should handle invalid permission checks gracefully', () => {
      // These shouldn't throw errors
      expect(() => hasPermission('OWNER', 'INVALID_PERMISSION' as Permission)).not.toThrow()
      expect(() => getPermissionsForRole('INVALID' as OrganizationRole)).not.toThrow()
    })

    it('should handle empty permission arrays', () => {
      expect(hasAnyPermission('OWNER', [])).toBe(false)
      expect(hasAllPermissions('OWNER', [])).toBe(true)
    })

    it('should be consistent in permission hierarchies', () => {
      // OWNER should have all permissions that ADMIN has
      const ownerPerms = getPermissionsForRole('OWNER')
      const adminPerms = getPermissionsForRole('ADMIN')

      adminPerms.forEach(perm => {
        expect(ownerPerms).toContain(perm)
      })

      // ADMIN should have all permissions that MODERATOR has (except what's explicitly restricted)
      const moderatorPerms = getPermissionsForRole('MODERATOR')
      const sharedPerms = moderatorPerms.filter(perm => adminPerms.includes(perm))

      expect(sharedPerms.length).toBeGreaterThan(0)
    })
  })
})