import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { getSubscriber, SubscriberError } from '@/services/subscribers'
import { SubscriberSections } from '@/components/subscribers/subscriber-sections'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Subscriber Details | Sona Provisioning',
}

export default async function SubscriberDetailPage({ params }: Props) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  let data
  try {
    data = await getSubscriber(decodedId)
  } catch (error) {
    if (error instanceof SubscriberError) {
      if (error.status === 401) {
        redirect('/login')
      }
      if (error.status === 404) {
        return (
          <Alert variant="destructive">
            <AlertTitle>Subscriber not found</AlertTitle>
            <AlertDescription>
              No subscriber exists for identifier <span className="font-mono">{decodedId}</span>. Try another search.
            </AlertDescription>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/subscribers">Back to search</Link>
              </Button>
            </div>
          </Alert>
        )
      }
      return (
        <Alert variant="destructive">
          <AlertTitle>Could not load subscriber</AlertTitle>
          <AlertDescription>
            {error.message}. Please try again.
          </AlertDescription>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/subscribers">Back to search</Link>
            </Button>
          </div>
        </Alert>
      )
    }

    throw error
  }

  const subscriber = data.data

  return (
    <div className="space-y-6">
      <Card className="border-slate-200/80 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl">Subscriber {subscriber.iccid}</CardTitle>
            <p className="text-sm text-muted-foreground">Request ID: {data.request_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={subscriber.subscriber_state ? 'success' : 'muted'}>
              {subscriber.subscriber_state ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="secondary">{data.cached ? 'Cached' : 'Live'}</Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">MSISDN:</span>
            <span className="font-mono text-base text-foreground">{subscriber.msisdn}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Admin: {subscriber.admin_info}</span>
          </div>
        </CardContent>
      </Card>

      <SubscriberSections subscriber={subscriber} id={decodedId} />

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/subscribers">Search again</Link>
        </Button>
      </div>
    </div>
  )
}
