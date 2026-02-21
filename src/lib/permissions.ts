import { OrganizationRole } from '@/lib/types'

export function isOwner(role: OrganizationRole | null | undefined): boolean {
  return role === 'OWNER'
}

export function isMember(role: OrganizationRole | null | undefined): boolean {
  return role === 'OWNER' || role === 'MEMBER'
}
