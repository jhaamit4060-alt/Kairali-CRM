'use client'

import { useAuth } from '@/hooks/use-auth'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Map routes to required permissions
const pagePermissions: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/leads': 'leads.view',
  '/leads/assign': 'leads.assign',
  '/leads/duplicates': 'leads.view',
  '/calls': 'calls.view',
  '/reports': 'reports.view',
  '/reports/sales-conversion': 'reports.view',
  '/performance': 'performance.view',
  '/users': 'users.view',
  '/helpdesk': 'helpdesk.view',
  '/fms': 'fms.view',
  '/fms/bookings': 'bookings.view',
  '/fms/bookings/villa-raag': 'villa_raag.view',
  '/fms/bookings/employee-wise': 'bookings.view',
  '/fms/bookings/team': 'team.view',
  '/fms/bookings/new': 'bookings.view',
  '/fms/bookings/verified': 'bookings.view',
  '/fms/bookings/unverified': 'bookings.view',
  '/fms/complaints': 'fms.view',
  '/fms/complaints/new': 'fms.view',
  '/fms/doctor-consultation': 'fms.view',
  '/fms/riya-sharma': 'fms.view',
  '/fms/v3': 'fms.view',
  '/doctor-consultation': 'doctor.consultation.view',
  '/doctor-consultation/calendar': 'doctor.consultation.view',
  '/doctor-consultation/history': 'doctor.consultation.view',
  '/doctor-consultation/prescription/new': 'doctor.consultation.view',
  '/marketing-dashboard': 'marketing.view',
  '/marketing-funnel': 'marketing_funnel.view',
  '/marketing/google-ppc': 'marketing_google_report.view',
  '/marketing/facebook-ppc': 'marketing_facebook_report.view',
  '/google-adword-reports': 'google_adword_report.view',
  '/calls/reports': 'calls_report.view',
  '/sales/reports': 'sales_report.view',
  '/voicecall/data?tab=received': 'ai_voice_received.view',
  '/voicecall/data?tab=sent': 'ai_voice_sent.view',
  '/voicecall/summary': 'ai_voice_summary.view',
  '/meetings': 'meetings.view',
  '/accounts-tracker': 'accounts_tracker.view',
  '/MR-FMS': 'mr-fms.view',
  '/crr-fms': 'crr_fms.view',
  '/voicecall/non-qualified': 'non_qualified.view',
  '/fms/pending-tasks': 'task_fms.view',
  'fms/enquiry-reverification': 'cold_enquiry_reverification.view',
}

const isRestricted = (pathname: string) => {
  const path = pathname.replace(/\/$/, '') || '/'

  if (path.startsWith('/fms/complaints')) {
    return true
  }

  const exactRestricted = [
    '/helpdesk',
    '/meet',
    '/performance',
    '/users',
    '/calls',
    '/fms',
    '/fms/bookings',
    '/fms/bookings/employee-wise',
    '/fms/bookings/new',
    '/fms/bookings/unverified',
    '/fms/bookings/verified',
    '/fms/doctor-consultation',
    '/fms/v3',
    '/leads/duplicates',
    '/leads/duplicates/assign',
    '/leads/duplicates/duplicates',
    '/leads/duplicates_old',
    '/reports',
    '/reports/sales-conversion',
    '/marketing-dashboard'
  ]

  return exactRestricted.includes(path)
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, hasPermission, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return

    // Allow access to login page for all users
    if (pathname === '/') return

    // If route is restricted, redirect to access-denied
    if (isRestricted(pathname)) {
      router.replace('/access-denied')
      return
    }

    // Check if current path requires permission
    const requiredPermission = pagePermissions[pathname]

    // If route requires permission and user doesn't have it, redirect to access-denied
    if (requiredPermission && user && !hasPermission(requiredPermission)) {
      router.replace('/access-denied')
    }
  }, [user, isLoading, pathname, hasPermission, router])

  return <>{children}</>
}
