import { z } from 'zod'

export const buyerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  business_type: z.string().optional().nullable(),
  value_chains: z.array(z.string()).optional().default([]),
  county: z.string().min(1, "County is required"),
  contact_name: z.string().min(2, "Contact name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  organization_id: z.string().uuid().optional(),
})

export const visitSchema = z.object({
  id: z.string().uuid().optional(),
  buyer_id: z.string().uuid().optional(),
  buyer_name: z.string().min(2),
  buyer_type: z.string(),
  activity_type: z.string(),
  scheduled_date: z.string(),
  status: z.enum(['planned', 'completed', 'cancelled']).default('planned'),
  organization_id: z.string().uuid().optional(),
})

export const agentSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(['admin', 'agent']).default('agent'),
  organization_id: z.string().uuid().optional(),
})

export const visitUpdateSchema = z.object({
  contact_name: z.string().min(2),
  phone: z.string().min(10),
  contact_designation: z.string().optional(),
  buyer_feedback: z.string().optional(),
  active_farmers: z.number().optional().default(0),
}).passthrough()
