'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function LeadsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new simple lead lists system
    router.replace('/leads/lists')
  }, [router])

  return (
    <ProtectedRoute>
      <div className="p-6 text-center">
        <div>Redirecting to Lead Lists...</div>
      </div>
    </ProtectedRoute>
  )
}