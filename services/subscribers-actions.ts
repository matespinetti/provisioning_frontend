'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import {
  apnUpdateSchema,
  networkAccessSchema,
  stateSchema,
  aorUpdateSchema,
  creditUpdateSchema,
  blockDataUsageSchema,
} from '@/lib/validation/subscriber-edit'
import { createSubscriberSchema } from '@/lib/validation/subscriber-create'
import type {
  ApnUpdateInput,
  NetworkAccessInput,
  StateUpdateInput,
  AorUpdateInput,
  CreditUpdateInput,
  BlockDataUsageInput,
} from '@/lib/validation/subscriber-edit'
import type { CreateSubscriberInput } from '@/lib/validation/subscriber-create'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function authorizedFetch(path: string, options: RequestInit) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) {
    throw new Error('Unauthorized')
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => undefined)
    const message =
      (detail as any)?.msg ||
      (detail as any)?.detail?.reason ||
      (detail as any)?.detail?.message ||
      (typeof (detail as any)?.detail === 'string'
        ? (detail as any)?.detail
        : JSON.stringify((detail as any)?.detail || detail)) ||
      res.statusText
    throw new Error(message || 'Request failed')
  }
  return res
}

export async function patchState(id: string, input: StateUpdateInput) {
  const payload = stateSchema.parse(input)
  const encoded = encodeURIComponent(id)
  await authorizedFetch(`/api/v1/subscribers/${encoded}/state`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  revalidatePath(`/subscribers/${id}`)
}

export async function patchApn(id: string, input: ApnUpdateInput) {
  const payload = apnUpdateSchema.parse(input)
  const encoded = encodeURIComponent(id)
  await authorizedFetch(`/api/v1/subscribers/${encoded}/apn`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  revalidatePath(`/subscribers/${id}`)
}

export async function patchAor(id: string, input: AorUpdateInput) {
  const payload = aorUpdateSchema.parse(input)
  const encoded = encodeURIComponent(id)
  await authorizedFetch(`/api/v1/subscribers/${encoded}/aor`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  revalidatePath(`/subscribers/${id}`)
}

export async function patchCredit(id: string, input: CreditUpdateInput) {
  const payload = creditUpdateSchema.parse(input)
  const encoded = encodeURIComponent(id)
  await authorizedFetch(`/api/v1/subscribers/${encoded}/credit`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  revalidatePath(`/subscribers/${id}`)
}

export async function patchBlockDataUsage(id: string, input: BlockDataUsageInput) {
  const payload = blockDataUsageSchema.parse(input)
  const encoded = encodeURIComponent(id)
  await authorizedFetch(`/api/v1/subscribers/${encoded}/block-data-usage`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  revalidatePath(`/subscribers/${id}`)
}

export async function patchNetworkAccess(id: string, input: NetworkAccessInput) {
  const payload = networkAccessSchema.parse(input)
  const encoded = encodeURIComponent(id)
  await authorizedFetch(`/api/v1/subscribers/${encoded}/network-access-list`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  revalidatePath(`/subscribers/${id}`)
}

export async function createSubscriber(input: CreateSubscriberInput) {
  const payload = createSubscriberSchema.parse(input)
  const body = {
    iccid: payload.iccid,
    msisdn: payload.msisdn,
    cust_id: payload.cust_id,
    admin_info: payload.admin_info,
    aor: payload.aor,
    apn: payload.apn_enabled ? payload.apn : null,
    subscriber_state: payload.subscriber_state,
    network_access_list: payload.network_access_list,
    contract: payload.contract,
    credit: payload.credit,
  }

  const res = await authorizedFetch(`/api/v1/subscribers`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function deleteSubscriber(id: string) {
  const encoded = encodeURIComponent(id)
  const res = await authorizedFetch(`/api/v1/subscribers/${encoded}`, {
    method: 'DELETE',
  })
  return res.json()
}
