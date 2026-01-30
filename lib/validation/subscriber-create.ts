import { z } from 'zod'
import { iccidSchema, msisdnSchema } from './subscriber'

const custIdSchema = z
  .string()
  .regex(/^9[0-9]{6}$/, 'Customer ID must be 7 digits starting with 9')

const adminInfoSchema = z
  .string()
  .min(1, 'Admin info is required')
  .max(24, 'Admin info must be 24 characters or less')

const aorSchema = z.object({
  domain_id: z.number().int().min(1).max(99999),
  auth_username: z
    .string()
    .regex(/^\+?[a-zA-Z0-9\-.@*#]{4,16}$/, 'Invalid AOR username'),
  auth_password: z
    .string()
    .regex(/^\+?[a-zA-Z0-9\-.@*#]{4,16}$/, 'Invalid AOR password'),
})

const apnSchema = z.object({
  name: z.string().regex(/^([a-z0-9\-.]){2,43}\.[a-z]{2,10}$/, 'Invalid APN name'),
  speed_up: z.union([z.literal('max'), z.number().int().nonnegative()]),
  speed_down: z.union([z.literal('max'), z.number().int().nonnegative()]),
})

const networkAccessSchema = z.object({
  zoneNL: z.boolean(),
  zone1: z.boolean(),
  zone2: z.boolean(),
  zone3: z.boolean(),
  zone4: z.boolean(),
  zone5: z.boolean(),
})

const contractSchema = z.object({
  service_package: z.number().int(),
  service_profile: z.number().int().min(0).max(7),
  duration: z.number().int(),
})

const creditSchema = z.object({
  max_credit: z.number().min(0).max(99999.99),
})

export const createSubscriberSchema = z
  .object({
    iccid: iccidSchema,
    msisdn: msisdnSchema,
    cust_id: custIdSchema,
    admin_info: adminInfoSchema,
    subscriber_state: z.boolean(),
    aor: aorSchema,
    apn_enabled: z.boolean(),
    apn: apnSchema.optional(),
    network_access_list: networkAccessSchema,
    contract: contractSchema,
    credit: creditSchema,
  })
  .superRefine((data, ctx) => {
    if (data.apn_enabled && !data.apn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "APN settings are required when APN is enabled",
        path: ["apn"],
      })
    }
  })

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>
