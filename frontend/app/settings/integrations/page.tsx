'use client'

import ProtectedRoute from '../../../components/auth/ProtectedRoute'
import AppLayout from '../../../components/layout/AppLayout'
import WebhookManager from '../../../components/webhooks/WebhookManager'

export default function IntegrationsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
            <p className="text-gray-600">Connect external services and configure webhooks</p>
          </div>

          {/* Webhooks Section */}
          <WebhookManager />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}