import { z } from 'zod'

export const iccidSchema = z
  .string()
  .regex(/^8931\d{16}$/, 'ICCID must be 20 digits starting with 8931')

export const msisdnSchema = z
  .string()
  .regex(
    /^(316\d{8}|31970\d{8})$/,
    'MSISDN must be 316XXXXXXXX (11 digits) or 31970XXXXXXXX (13 digits)'
  )

export const subscriberIdSchema = z.union([iccidSchema, msisdnSchema])

export type SubscriberIdType = 'iccid' | 'msisdn'

export const searchFormSchema = z
  .object({
    mode: z.enum(['iccid', 'msisdn']),
    value: z.string().min(1, 'Identifier is required'),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'iccid') {
      const res = iccidSchema.safeParse(data.value)
      if (!res.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error.issues[0].message,
          path: ['value'],
        })
      }
    } else {
      const res = msisdnSchema.safeParse(data.value)
      if (!res.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error.issues[0].message,
          path: ['value'],
        })
      }
    }
  })
