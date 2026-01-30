import { Metadata } from 'next'
import { SearchForm } from '@/components/subscribers/search-form'

export const metadata: Metadata = {
  title: 'Find Subscriber | Sona Provisioning',
}

export default function SubscribersSearchPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Read / Edit Subscriber</h1>
        <p className="text-muted-foreground">
          Lookup subscribers by ICCID or MSISDN. Editing coming next.
        </p>
      </div>
      <SearchForm />
    </div>
  )
}
