import { z } from 'zod'
import { msisdnSchema, iccidSchema } from './subscriber'

export const subscriberIdParamSchema = z.union([iccidSchema, msisdnSchema])

export const apnUpdateSchema = z.object({
  name: z
    .string({ message: 'APN name is required' })
    .regex(/^([a-z0-9\-.]){2,43}\.[a-z]{2,10}$/, 'Invalid APN name'),
  speed_up: z.union([z.literal('max'), z.number().int().nonnegative()]),
  speed_down: z.union([z.literal('max'), z.number().int().nonnegative()]),
})

export const aorUpdateSchema = z.object({
  domain_id: z.number().int().min(1).max(99999),
  auth_username: z.string().min(4).max(32),
  auth_password: z.string().min(4).max(32),
})

export const creditUpdateSchema = z.object({
  max_credit: z.number().min(0).max(99999.99),
})

export const networkAccessSchema = z.object({
  zoneNL: z.boolean(),
  zone1: z.boolean(),
  zone2: z.boolean(),
  zone3: z.boolean(),
  zone4: z.boolean(),
  zone5: z.boolean(),
})

export const blockDataUsageSchema = z.object({
  enabled: z.boolean(),
  block_until: z.string().nullable(),
  scope: z.enum(['outside_eu_regulation', 'all']).nullable(),
})

export const stateSchema = z.object({
  subscriber_state: z.boolean(),
})

export type ApnUpdateInput = z.infer<typeof apnUpdateSchema>
export type AorUpdateInput = z.infer<typeof aorUpdateSchema>
export type CreditUpdateInput = z.infer<typeof creditUpdateSchema>
export type NetworkAccessInput = z.infer<typeof networkAccessSchema>
export type BlockDataUsageInput = z.infer<typeof blockDataUsageSchema>
export type StateUpdateInput = z.infer<typeof stateSchema>
