import { z } from 'zod'

// Registration status enum
export const registrationStatusSchema = z.enum(['OPEN', 'CLOSED', 'UPCOMING'])

// Team registration status enum
export const teamRegistrationStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED'])

// Tournament-specific fields (extends league creation)
export const tournamentFieldsSchema = z.object({
  registrationUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  rulesText: z.string().max(10000, 'Rules text too long').optional(),
  socialLinks: z.record(z.string(), z.string().url('Invalid URL').or(z.literal(''))).optional(),
  format: z.string().max(200, 'Format description too long').optional(),
  venue: z.string().max(300, 'Venue too long').optional(),
  contactInfo: z.record(z.string(), z.string()).optional(),
  registrationStatus: registrationStatusSchema.optional(),
})

// Create fixture schema
export const createFixtureSchema = z.object({
  matchNumber: z.number().int().min(1, 'Match number must be at least 1'),
  teamAName: z.string().min(1, 'Team A name is required').max(100, 'Team name too long'),
  teamBName: z.string().min(1, 'Team B name is required').max(100, 'Team name too long'),
  teamAId: z.string().uuid().optional(),
  teamBId: z.string().uuid().optional(),
  venue: z.string().max(300, 'Venue too long').optional(),
  scheduledAt: z.string().datetime({ message: 'Invalid date/time' }).optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
})

// Update fixture schema (includes result)
export const updateFixtureSchema = createFixtureSchema.partial().extend({
  result: z.string().max(500, 'Result too long').optional(),
  winner: z.string().max(100, 'Winner name too long').optional(),
})

// Tournament registration schema (submitted by external teams)
export const tournamentRegistrationSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters').max(100, 'Team name too long'),
  contactName: z.string().min(2, 'Contact name must be at least 2 characters').max(100, 'Name too long'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().max(20, 'Phone number too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
})

// Update registration status (by tournament owner)
export const updateRegistrationStatusSchema = z.object({
  status: teamRegistrationStatusSchema,
})

export type TournamentFieldsInput = z.infer<typeof tournamentFieldsSchema>
export type CreateFixtureInput = z.infer<typeof createFixtureSchema>
export type UpdateFixtureInput = z.infer<typeof updateFixtureSchema>
export type TournamentRegistrationInput = z.infer<typeof tournamentRegistrationSchema>
export type UpdateRegistrationStatusInput = z.infer<typeof updateRegistrationStatusSchema>
