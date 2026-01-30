import { Metadata } from 'next'
import { DashboardContent } from './dashboard-content'

export const metadata: Metadata = {
  title: 'Dashboard | Sona Provisioning',
  description: 'Manage your mobile subscribers',
}

export default function DashboardPage() {
  return <DashboardContent />
}
