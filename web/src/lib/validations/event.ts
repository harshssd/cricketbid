import { z } from 'zod'

// Event type enum
export const eventTypeSchema = z.enum(['PRACTICE', 'MATCH', 'SOCIAL', 'OTHER'])

// RSVP status enum
export const rsvpStatusSchema = z.enum(['GOING', 'NOT_GOING', 'MAYBE'])

// Base event fields (without refinement so .partial() works)
const eventFieldsSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description too long').optional(),
  eventType: eventTypeSchema,
  location: z.string().max(300, 'Location too long').optional(),
  startsAt: z.string().datetime({ message: 'Invalid start date/time' }),
  endsAt: z.string().datetime({ message: 'Invalid end date/time' }).optional(),
})

// Create event schema with cross-field validation
export const createEventSchema = eventFieldsSchema.refine(
  (data) => {
    if (data.endsAt && data.startsAt) {
      return new Date(data.endsAt) > new Date(data.startsAt)
    }
    return true
  },
  { message: 'End time must be after start time', path: ['endsAt'] }
)

// Update event schema (partial fields, no refinement needed)
export const updateEventSchema = eventFieldsSchema.partial()

// RSVP schema
export const rsvpSchema = z.object({
  status: rsvpStatusSchema,
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type RsvpInput = z.infer<typeof rsvpSchema>
