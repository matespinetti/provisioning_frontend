import { cookies } from 'next/headers'
import { SubscriberResponse } from '@/types/subscriber'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export class SubscriberError extends Error {
  status: number
  detail?: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

export async function getSubscriber(id: string): Promise<SubscriberResponse> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    throw new SubscriberError('Unauthorized', 401)
  }

  const res = await fetch(`${API_URL}/api/v1/subscribers/${id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => undefined)
    if (res.status === 404) {
      throw new SubscriberError('Subscriber not found', 404, detail)
    }
    if (res.status === 401) {
      throw new SubscriberError('Unauthorized', 401, detail)
    }
    if (res.status === 422) {
      throw new SubscriberError('Invalid identifier format', 422, detail)
    }
    throw new SubscriberError('Failed to fetch subscriber', res.status, detail)
  }

  return (await res.json()) as SubscriberResponse
}
