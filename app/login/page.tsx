import { LoginForm } from '@/components/auth/login-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | Sona Provisioning',
  description: 'Sign in to your Sona Business Provisioning account',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
            Sona Provisioning
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Business Subscriber Management
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
