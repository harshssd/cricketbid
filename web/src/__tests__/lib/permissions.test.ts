import { isOwner, isMember } from '@/lib/permissions'
import { OrganizationRole } from '@/lib/types'

describe('Permission System', () => {
  describe('isOwner', () => {
    it('should return true for OWNER role', () => {
      expect(isOwner('OWNER')).toBe(true)
    })

    it('should return false for MEMBER role', () => {
      expect(isOwner('MEMBER')).toBe(false)
    })

    it('should return false for null', () => {
      expect(isOwner(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isOwner(undefined)).toBe(false)
    })

    it('should return false for invalid role', () => {
      expect(isOwner('INVALID' as OrganizationRole)).toBe(false)
    })
  })

  describe('isMember', () => {
    it('should return true for OWNER role', () => {
      expect(isMember('OWNER')).toBe(true)
    })

    it('should return true for MEMBER role', () => {
      expect(isMember('MEMBER')).toBe(true)
    })

    it('should return false for null', () => {
      expect(isMember(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isMember(undefined)).toBe(false)
    })

    it('should return false for invalid role', () => {
      expect(isMember('INVALID' as OrganizationRole)).toBe(false)
    })
  })

  describe('Role hierarchy', () => {
    it('OWNER should be both owner and member', () => {
      expect(isOwner('OWNER')).toBe(true)
      expect(isMember('OWNER')).toBe(true)
    })

    it('MEMBER should be member but not owner', () => {
      expect(isOwner('MEMBER')).toBe(false)
      expect(isMember('MEMBER')).toBe(true)
    })

    it('null role should have no access', () => {
      expect(isOwner(null)).toBe(false)
      expect(isMember(null)).toBe(false)
    })

    it('undefined role should have no access', () => {
      expect(isOwner(undefined)).toBe(false)
      expect(isMember(undefined)).toBe(false)
    })
  })
})
