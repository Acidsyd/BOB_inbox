/**
 * React Component Tests for Pricing and Billing Components
 * Tests component rendering, user interactions, form validation
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { jest } from '@jest/globals'

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null)
  })
}))

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn().mockResolvedValue({
    elements: jest.fn().mockReturnValue({
      create: jest.fn().mockReturnValue({
        mount: jest.fn(),
        unmount: jest.fn(),
        destroy: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      })
    })
  })
}))

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="card-element">Stripe Card Element</div>,
  useStripe: () => ({
    confirmCardSetup: jest.fn(),
    confirmPayment: jest.fn()
  }),
  useElements: () => ({
    getElement: jest.fn()
  })
}))

// Mock auth context
jest.mock('@/lib/auth/context', () => ({
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    isLoading: false
  })
}))

// Mock billing hooks
jest.mock('@/hooks/useBilling', () => ({
  useBilling: () => ({
    plans: mockPlans,
    subscription: null,
    createSubscription: jest.fn(),
    isLoading: false
  }),
  usePromotionValidation: () => ({
    validatePromotion: jest.fn(),
    validation: null,
    isValidating: false,
    clearValidation: jest.fn()
  })
}))

import PricingPage from '@/app/pricing/page'
import RegisterPage from '@/app/register/page'
import { PricingCard } from '@/components/pricing/PricingCard'
import { PlanSelection } from '@/components/billing/PlanSelection'
import { PaymentMethodForm } from '@/components/billing/PaymentMethodForm'
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview'

// Test data
const mockPlans = [
  {
    id: 'basic_monthly',
    plan_code: 'basic_monthly',
    name: 'Basic',
    price: 1500, // €15.00 in cents
    currency: 'eur',
    interval: 'month',
    emails_limit: 8000,
    email_accounts_limit: 10,
    features: ['8,000 emails/month', '10 email accounts', 'Email warm-up included']
  },
  {
    id: 'full_monthly',
    plan_code: 'full_monthly',
    name: 'Full',
    price: 3000, // €30.00 in cents
    currency: 'eur',
    interval: 'month',
    emails_limit: 50000,
    email_accounts_limit: 25,
    features: ['50,000 emails/month', '25 email accounts', 'Unlimited warm-up']
  },
  {
    id: 'unlimited_monthly',
    plan_code: 'unlimited_monthly',
    name: 'Unlimited',
    price: 6000, // €60.00 in cents
    currency: 'eur',
    interval: 'month',
    emails_limit: -1, // Unlimited
    email_accounts_limit: 100,
    features: ['Unlimited emails/month', '100 email accounts', 'API access']
  },
  {
    id: 'full_yearly',
    plan_code: 'full_yearly',
    name: 'Full Yearly',
    price: 15000, // €150.00 in cents
    currency: 'eur',
    interval: 'year',
    emails_limit: 50000,
    email_accounts_limit: 25,
    features: ['Everything in Full', 'Early adopter pricing', 'Locked-in rate forever']
  }
]

const mockPromotion = {
  valid: true,
  code: 'EARLY100',
  discount_percentage: 50,
  discount_amount: 15000,
  final_price: 15000,
  applicable_plans: ['full_yearly'],
  description: 'Early adopter 50% discount'
}

// Test utilities
const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('PricingPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders all pricing plans correctly', async () => {
    renderWithQueryClient(<PricingPage />)

    // Check page title
    expect(screen.getByText(/Send 60% More Emails/i)).toBeInTheDocument()

    // Check all plan cards are rendered
    expect(screen.getByText('Basic')).toBeInTheDocument()
    expect(screen.getByText('Full')).toBeInTheDocument()
    expect(screen.getByText('Unlimited')).toBeInTheDocument()
    expect(screen.getByText('Full Yearly')).toBeInTheDocument()

    // Check pricing
    expect(screen.getByText('€15')).toBeInTheDocument()
    expect(screen.getByText('€30')).toBeInTheDocument()
    expect(screen.getByText('€60')).toBeInTheDocument()
    expect(screen.getByText('€150')).toBeInTheDocument()

    // Check features
    expect(screen.getByText('8,000 emails/month')).toBeInTheDocument()
    expect(screen.getByText('50,000 emails/month')).toBeInTheDocument()
    expect(screen.getByText('Unlimited emails/month')).toBeInTheDocument()
  })

  test('displays promotion banner correctly', () => {
    renderWithQueryClient(<PricingPage />)

    // Check for promotion indicators
    expect(screen.getByText(/50% OFF/i)).toBeInTheDocument()
    expect(screen.getByText(/LIMITED TIME/i)).toBeInTheDocument()
    expect(screen.getByText(/First 100 users/i)).toBeInTheDocument()
  })

  test('shows competitor comparison section', () => {
    renderWithQueryClient(<PricingPage />)

    // Check competitor comparison
    expect(screen.getByText(/The Real Cost/i)).toBeInTheDocument()
    expect(screen.getByText(/Smartlead/i)).toBeInTheDocument()
    expect(screen.getByText(/68% more expensive/i)).toBeInTheDocument()
  })

  test('displays FAQ section', () => {
    renderWithQueryClient(<PricingPage />)

    // Check FAQ section
    expect(screen.getByText(/Frequently Asked Questions/i)).toBeInTheDocument()
    expect(screen.getByText(/Why do you offer 8,000 emails/i)).toBeInTheDocument()
    expect(screen.getByText(/What's the EARLY100 promotion/i)).toBeInTheDocument()
  })

  test('has working navigation links', () => {
    renderWithQueryClient(<PricingPage />)

    // Check call-to-action buttons
    const trialButtons = screen.getAllByText(/Start Free Trial/i)
    expect(trialButtons.length).toBeGreaterThan(0)

    // Check that buttons have correct hrefs
    const registerLinks = screen.getAllByRole('link', { name: /start free trial/i })
    registerLinks.forEach(link => {
      expect(link).toHaveAttribute('href', expect.stringMatching(/\/register/))
    })
  })

  test('displays early adopter counter', () => {
    renderWithQueryClient(<PricingPage />)

    // Check early adopter spots remaining
    expect(screen.getByText(/early adopter spots left/i)).toBeInTheDocument()
  })
})

describe('PricingCard Component', () => {
  const mockPlan = mockPlans[0] // Basic plan

  test('renders plan information correctly', () => {
    render(
      <PricingCard 
        plan={mockPlan}
        isPopular={false}
        promotion={null}
        onSelect={jest.fn()}
      />
    )

    expect(screen.getByText('Basic')).toBeInTheDocument()
    expect(screen.getByText('€15')).toBeInTheDocument()
    expect(screen.getByText('8,000 emails/month')).toBeInTheDocument()
    expect(screen.getByText('10 email accounts')).toBeInTheDocument()
  })

  test('shows promotion pricing when provided', () => {
    render(
      <PricingCard 
        plan={mockPlans[3]} // Full yearly
        isPopular={false}
        promotion={mockPromotion}
        onSelect={jest.fn()}
      />
    )

    expect(screen.getByText('50% OFF')).toBeInTheDocument()
    expect(screen.getByText('€150')).toBeInTheDocument()
  })

  test('handles plan selection', async () => {
    const mockOnSelect = jest.fn()
    
    render(
      <PricingCard 
        plan={mockPlan}
        isPopular={false}
        promotion={null}
        onSelect={mockOnSelect}
      />
    )

    const selectButton = screen.getByRole('button', { name: /select|choose/i })
    await userEvent.click(selectButton)

    expect(mockOnSelect).toHaveBeenCalledWith(mockPlan)
  })

  test('displays popular badge when marked as popular', () => {
    render(
      <PricingCard 
        plan={mockPlan}
        isPopular={true}
        promotion={null}
        onSelect={jest.fn()}
      />
    )

    expect(screen.getByText(/most popular/i)).toBeInTheDocument()
  })
})

describe('RegisterPage Component', () => {
  test('renders registration form', async () => {
    renderWithQueryClient(<RegisterPage />)

    // Check form fields
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  test('shows selected plan when provided in URL', () => {
    // Mock search params
    const mockUseSearchParams = jest.fn().mockReturnValue({
      get: jest.fn((param) => {
        if (param === 'plan') return 'basic_monthly'
        if (param === 'promo') return null
        return null
      })
    })

    jest.mocked(require('next/navigation').useSearchParams).mockImplementation(mockUseSearchParams)

    renderWithQueryClient(<RegisterPage />)

    // Should show Basic plan selection
    expect(screen.getByText('Basic')).toBeInTheDocument()
  })

  test('validates form input', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<RegisterPage />)

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /continue/i })
    await user.click(submitButton)

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument()
    })
  })

  test('handles form submission correctly', async () => {
    const user = userEvent.setup()
    const mockRegister = jest.fn().mockResolvedValue({ success: true })

    // Mock the register function
    jest.mocked(require('@/lib/auth/context').useAuth).mockReturnValue({
      user: null,
      register: mockRegister,
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    })

    renderWithQueryClient(<RegisterPage />)

    // Fill out form
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/company/i), 'Test Corp')
    await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /continue/i })
    await user.click(submitButton)

    // Should advance to payment step
    await waitFor(() => {
      expect(screen.getByText(/payment/i)).toBeInTheDocument()
    })
  })

  test('shows step indicator correctly', () => {
    renderWithQueryClient(<RegisterPage />)

    // Should show steps
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Payment')).toBeInTheDocument()
  })
})

describe('PlanSelection Component', () => {
  test('displays plan details correctly', () => {
    render(
      <PlanSelection
        selectedPlanCode="basic_monthly"
        plan={mockPlans[0]}
        promotion={null}
        billingCycle="monthly"
        isLoading={false}
      />
    )

    expect(screen.getByText('Basic')).toBeInTheDocument()
    expect(screen.getByText('€15')).toBeInTheDocument()
    expect(screen.getByText(/month/i)).toBeInTheDocument()
  })

  test('shows promotion details when applied', () => {
    render(
      <PlanSelection
        selectedPlanCode="full_yearly"
        plan={mockPlans[3]}
        promotion={mockPromotion}
        billingCycle="yearly"
        isLoading={false}
      />
    )

    expect(screen.getByText('EARLY100')).toBeInTheDocument()
    expect(screen.getByText('50% OFF')).toBeInTheDocument()
    expect(screen.getByText('€150')).toBeInTheDocument()
  })

  test('displays loading state', () => {
    render(
      <PlanSelection
        selectedPlanCode="basic_monthly"
        plan={mockPlans[0]}
        promotion={null}
        billingCycle="monthly"
        isLoading={true}
      />
    )

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})

describe('PaymentMethodForm Component', () => {
  test('renders Stripe payment elements', () => {
    render(
      <PaymentMethodForm
        onPaymentMethodCreated={jest.fn()}
        onError={jest.fn()}
        isLoading={false}
        showBillingAddress={true}
      />
    )

    expect(screen.getByTestId('card-element')).toBeInTheDocument()
  })

  test('shows billing address form when requested', () => {
    render(
      <PaymentMethodForm
        onPaymentMethodCreated={jest.fn()}
        onError={jest.fn()}
        isLoading={false}
        showBillingAddress={true}
      />
    )

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/postal/i)).toBeInTheDocument()
  })

  test('handles form submission', async () => {
    const mockOnPaymentMethodCreated = jest.fn()
    const user = userEvent.setup()

    render(
      <PaymentMethodForm
        onPaymentMethodCreated={mockOnPaymentMethodCreated}
        onError={jest.fn()}
        isLoading={false}
        showBillingAddress={true}
      />
    )

    // Fill billing address
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/address/i), '123 Test St')
    await user.type(screen.getByLabelText(/city/i), 'Test City')
    await user.type(screen.getByLabelText(/postal/i), '12345')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /complete|submit/i })
    await user.click(submitButton)

    // Should attempt to create payment method
    // Note: Full Stripe integration testing would require more complex mocking
  })

  test('shows loading state during processing', () => {
    render(
      <PaymentMethodForm
        onPaymentMethodCreated={jest.fn()}
        onError={jest.fn()}
        isLoading={true}
        showBillingAddress={false}
      />
    )

    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/processing/i)).toBeInTheDocument()
  })
})

describe('SubscriptionOverview Component', () => {
  const mockSubscription = {
    id: 'sub_test_123',
    plan_code: 'basic_monthly',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cancel_at_period_end: false
  }

  test('displays active subscription details', () => {
    render(
      <SubscriptionOverview
        subscription={mockSubscription}
        plan={mockPlans[0]}
        usage={{ emails_sent: 2500, emails_limit: 8000 }}
      />
    )

    expect(screen.getByText('Basic')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('€15')).toBeInTheDocument()
  })

  test('shows usage information', () => {
    render(
      <SubscriptionOverview
        subscription={mockSubscription}
        plan={mockPlans[0]}
        usage={{ emails_sent: 2500, emails_limit: 8000 }}
      />
    )

    expect(screen.getByText('2,500')).toBeInTheDocument()
    expect(screen.getByText('8,000')).toBeInTheDocument()
  })

  test('displays cancellation status', () => {
    const canceledSubscription = {
      ...mockSubscription,
      cancel_at_period_end: true
    }

    render(
      <SubscriptionOverview
        subscription={canceledSubscription}
        plan={mockPlans[0]}
        usage={{ emails_sent: 2500, emails_limit: 8000 }}
      />
    )

    expect(screen.getByText(/cancel.*end.*period/i)).toBeInTheDocument()
  })

  test('handles subscription without plan gracefully', () => {
    render(
      <SubscriptionOverview
        subscription={mockSubscription}
        plan={null}
        usage={{ emails_sent: 0, emails_limit: 0 }}
      />
    )

    expect(screen.getByText(/loading|unknown/i)).toBeInTheDocument()
  })
})

describe('Accessibility Tests', () => {
  test('pricing page has proper heading structure', () => {
    renderWithQueryClient(<PricingPage />)

    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)

    // Should have h1
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()
  })

  test('form inputs have proper labels', () => {
    renderWithQueryClient(<RegisterPage />)

    const inputs = screen.getAllByRole('textbox')
    inputs.forEach(input => {
      // Each input should have an accessible name
      expect(input).toHaveAccessibleName()
    })
  })

  test('buttons have descriptive text', () => {
    renderWithQueryClient(<PricingPage />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName()
    })
  })

  test('pricing cards are keyboard navigable', async () => {
    renderWithQueryClient(<PricingPage />)
    const user = userEvent.setup()

    // Tab through pricing cards
    await user.tab()
    
    const focusedElement = document.activeElement
    expect(focusedElement).toBeInstanceOf(HTMLElement)
    expect(focusedElement?.tagName).toMatch(/BUTTON|A/)
  })
})

describe('Error Handling', () => {
  test('handles payment method creation errors', async () => {
    const mockOnError = jest.fn()

    render(
      <PaymentMethodForm
        onPaymentMethodCreated={jest.fn()}
        onError={mockOnError}
        isLoading={false}
        showBillingAddress={false}
      />
    )

    // Simulate Stripe error
    // This would require more complex Stripe mocking in real scenarios
  })

  test('shows error messages in registration form', async () => {
    const mockRegister = jest.fn().mockRejectedValue(new Error('Registration failed'))

    jest.mocked(require('@/lib/auth/context').useAuth).mockReturnValue({
      user: null,
      register: mockRegister,
      login: jest.fn(),
      logout: jest.fn(),
      isLoading: false
    })

    const user = userEvent.setup()
    renderWithQueryClient(<RegisterPage />)

    // Fill and submit form
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/company/i), 'Test Corp')
    await user.type(screen.getByLabelText(/password/i), 'SecurePassword123!')

    const submitButton = screen.getByRole('button', { name: /continue/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/failed|error/i)).toBeInTheDocument()
    })
  })

  test('handles network errors gracefully', () => {
    // Mock network error
    const originalFetch = global.fetch
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    renderWithQueryClient(<PricingPage />)

    // Component should still render without crashing
    expect(screen.getByText(/Send 60% More Emails/i)).toBeInTheDocument()

    global.fetch = originalFetch
  })
})