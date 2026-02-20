import { OrganizationRole } from '@/lib/types'

export enum Permission {
  // Organization management
  MANAGE_ORGANIZATION = 'manage_organization',
  DELETE_ORGANIZATION = 'delete_organization',
  UPDATE_ORGANIZATION_SETTINGS = 'update_organization_settings',

  // Member management
  INVITE_MEMBERS = 'invite_members',
  REMOVE_MEMBERS = 'remove_members',
  UPDATE_MEMBER_ROLES = 'update_member_roles',
  VIEW_ALL_MEMBERS = 'view_all_members',

  // Auction management
  CREATE_AUCTIONS = 'create_auctions',
  DELETE_AUCTIONS = 'delete_auctions',
  MODERATE_AUCTIONS = 'moderate_auctions',
  VIEW_ALL_AUCTIONS = 'view_all_auctions',

  // Content management
  MANAGE_CONTENT = 'manage_content',
  MODERATE_DISCUSSIONS = 'moderate_discussions',

  // Financial/Administrative
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_BILLING = 'manage_billing',

  // Basic permissions
  PARTICIPATE_IN_AUCTIONS = 'participate_in_auctions',
  VIEW_ORGANIZATION = 'view_organization',
  COMMENT_ON_AUCTIONS = 'comment_on_auctions'
}

// Define role-based permissions
const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  OWNER: [
    // Has all permissions
    Permission.MANAGE_ORGANIZATION,
    Permission.DELETE_ORGANIZATION,
    Permission.UPDATE_ORGANIZATION_SETTINGS,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.UPDATE_MEMBER_ROLES,
    Permission.VIEW_ALL_MEMBERS,
    Permission.CREATE_AUCTIONS,
    Permission.DELETE_AUCTIONS,
    Permission.MODERATE_AUCTIONS,
    Permission.VIEW_ALL_AUCTIONS,
    Permission.MANAGE_CONTENT,
    Permission.MODERATE_DISCUSSIONS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_BILLING,
    Permission.PARTICIPATE_IN_AUCTIONS,
    Permission.VIEW_ORGANIZATION,
    Permission.COMMENT_ON_AUCTIONS
  ],

  ADMIN: [
    // Administrative permissions except deleting organization
    Permission.UPDATE_ORGANIZATION_SETTINGS,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.UPDATE_MEMBER_ROLES, // Can update roles up to ADMIN level
    Permission.VIEW_ALL_MEMBERS,
    Permission.CREATE_AUCTIONS,
    Permission.DELETE_AUCTIONS,
    Permission.MODERATE_AUCTIONS,
    Permission.VIEW_ALL_AUCTIONS,
    Permission.MANAGE_CONTENT,
    Permission.MODERATE_DISCUSSIONS,
    Permission.VIEW_ANALYTICS,
    Permission.PARTICIPATE_IN_AUCTIONS,
    Permission.VIEW_ORGANIZATION,
    Permission.COMMENT_ON_AUCTIONS
  ],

  MODERATOR: [
    // Moderate content and manage some activities
    Permission.INVITE_MEMBERS,
    Permission.VIEW_ALL_MEMBERS,
    Permission.CREATE_AUCTIONS,
    Permission.MODERATE_AUCTIONS,
    Permission.VIEW_ALL_AUCTIONS,
    Permission.MANAGE_CONTENT,
    Permission.MODERATE_DISCUSSIONS,
    Permission.PARTICIPATE_IN_AUCTIONS,
    Permission.VIEW_ORGANIZATION,
    Permission.COMMENT_ON_AUCTIONS
  ],

  MEMBER: [
    // Basic participation permissions
    Permission.PARTICIPATE_IN_AUCTIONS,
    Permission.VIEW_ORGANIZATION,
    Permission.COMMENT_ON_AUCTIONS
  ]
}

/**
 * Check if a user has a specific permission in an organization
 */
export function hasPermission(
  userRole: OrganizationRole | null | undefined,
  permission: Permission
): boolean {
  if (!userRole) return false

  const rolePermissions = ROLE_PERMISSIONS[userRole]
  return rolePermissions.includes(permission)
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  userRole: OrganizationRole | null | undefined,
  permissions: Permission[]
): boolean {
  if (!userRole) return false

  return permissions.some(permission => hasPermission(userRole, permission))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  userRole: OrganizationRole | null | undefined,
  permissions: Permission[]
): boolean {
  if (!userRole) return false

  return permissions.every(permission => hasPermission(userRole, permission))
}

/**
 * Get all permissions for a specific role
 */
export function getPermissionsForRole(role: OrganizationRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if role A can manage (assign/remove) role B
 * Rules:
 * - OWNER can manage all roles
 * - ADMIN can manage MODERATOR and MEMBER
 * - MODERATOR cannot manage roles
 * - MEMBER cannot manage roles
 */
export function canManageRole(
  managerRole: OrganizationRole | null | undefined,
  targetRole: OrganizationRole
): boolean {
  if (!managerRole) return false

  switch (managerRole) {
    case 'OWNER':
      return true // Can manage all roles
    case 'ADMIN':
      return targetRole === 'MODERATOR' || targetRole === 'MEMBER'
    case 'MODERATOR':
    case 'MEMBER':
      return false
  }
}

/**
 * Check if a user can remove another user from organization
 */
export function canRemoveMember(
  removerRole: OrganizationRole | null | undefined,
  targetRole: OrganizationRole
): boolean {
  if (!removerRole || !hasPermission(removerRole, Permission.REMOVE_MEMBERS)) {
    return false
  }

  // Can only remove users with lower or equal privilege
  switch (removerRole) {
    case 'OWNER':
      return targetRole !== 'OWNER' // Can't remove other owners
    case 'ADMIN':
      return targetRole === 'MODERATOR' || targetRole === 'MEMBER'
    default:
      return false
  }
}

/**
 * Get the hierarchy level of a role (higher number = more privilege)
 */
export function getRoleLevel(role: OrganizationRole): number {
  switch (role) {
    case 'OWNER':
      return 4
    case 'ADMIN':
      return 3
    case 'MODERATOR':
      return 2
    case 'MEMBER':
      return 1
    default:
      return 0
  }
}

/**
 * Compare two roles and return if role1 has higher privilege than role2
 */
export function hasHigherPrivilege(role1: OrganizationRole, role2: OrganizationRole): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2)
}

/**
 * Get available roles that a user can assign
 */
export function getAssignableRoles(userRole: OrganizationRole | null | undefined): OrganizationRole[] {
  if (!userRole) return []

  switch (userRole) {
    case 'OWNER':
      return ['ADMIN', 'MODERATOR', 'MEMBER']
    case 'ADMIN':
      return ['MODERATOR', 'MEMBER']
    case 'MODERATOR':
    case 'MEMBER':
      return []
  }
}

/**
 * Utility hook for checking permissions in React components
 */
export function usePermissions(userRole: OrganizationRole | null | undefined) {
  return {
    can: (permission: Permission) => hasPermission(userRole, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
    canManage: (targetRole: OrganizationRole) => canManageRole(userRole, targetRole),
    canRemove: (targetRole: OrganizationRole) => canRemoveMember(userRole, targetRole),
    getAssignableRoles: () => getAssignableRoles(userRole),
    role: userRole,
    roleLevel: userRole ? getRoleLevel(userRole) : 0
  }
}