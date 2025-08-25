/**
 * Jest Setup for Frontend Component Tests
 * Configures testing environment for React components
 */

import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
    has: jest.fn(() => false),
    getAll: jest.fn(() => []),
    toString: jest.fn(() => ''),
    entries: jest.fn(() => []),
    keys: jest.fn(() => []),
    values: jest.fn(() => []),
    forEach: jest.fn()
  }),
  usePathname: () => '/',
  useParams: () => ({}),
  notFound: jest.fn()
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function Link({ children, href, ...props }) {
    return <a href={href} {...props}>{children}</a>
  }
})

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function Image({ src, alt, ...props }) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    elements: jest.fn(() => ({
      create: jest.fn(() => ({
        mount: jest.fn(),
        unmount: jest.fn(),
        destroy: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        update: jest.fn()
      })),
      getElement: jest.fn()
    })),
    confirmCardPayment: jest.fn(),
    confirmCardSetup: jest.fn(),
    createPaymentMethod: jest.fn()
  }))
}))

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => children,
  CardElement: () => <div data-testid="card-element" />,
  useStripe: () => ({
    confirmCardPayment: jest.fn(),
    confirmCardSetup: jest.fn(),
    createPaymentMethod: jest.fn(() => Promise.resolve({
      paymentMethod: { id: 'pm_test_card' },
      error: null
    }))
  }),
  useElements: () => ({
    getElement: jest.fn(() => ({
      focus: jest.fn(),
      blur: jest.fn(),
      clear: jest.fn()
    }))
  })
}))

// Mock authentication context
const mockAuthContext = {
  user: null,
  isLoading: false,
  login: jest.fn(() => Promise.resolve({ user: { id: 1, email: 'test@example.com' } })),
  register: jest.fn(() => Promise.resolve({ user: { id: 1, email: 'test@example.com' } })),
  logout: jest.fn(() => Promise.resolve()),
  refreshToken: jest.fn()
}

jest.mock('@/lib/auth/context', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }) => children
}))

// Mock billing hooks
jest.mock('@/hooks/useBilling', () => ({
  useBilling: () => ({
    plans: [
      {
        id: 'basic_monthly',
        plan_code: 'basic_monthly',
        name: 'Basic',
        price: 1500,
        currency: 'eur',
        interval: 'month',
        emails_limit: 8000,
        email_accounts_limit: 10,
        features: ['8,000 emails/month', '10 email accounts']
      }
    ],
    subscription: null,
    createSubscription: jest.fn(() => Promise.resolve({ success: true })),
    updateSubscription: jest.fn(() => Promise.resolve({ success: true })),
    cancelSubscription: jest.fn(() => Promise.resolve({ success: true })),
    isLoading: false,
    error: null
  }),
  usePromotionValidation: () => ({
    validatePromotion: jest.fn(),
    validation: null,
    isValidating: false,
    clearValidation: jest.fn()
  })
}))

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => Promise.resolve({ data: [], error: null })),
      delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }
}))

// Mock TanStack Query
const mockQueryClient = {
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn(),
  refetchQueries: jest.fn(),
  clear: jest.fn(),
  removeQueries: jest.fn(),
  cancelQueries: jest.fn(),
  isFetching: jest.fn(() => 0),
  getQueriesData: jest.fn(() => []),
  getMutationCache: jest.fn(() => ({
    findAll: jest.fn(() => [])
  }))
}

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: jest.fn()
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    error: null,
    data: undefined
  })),
  useQueryClient: () => mockQueryClient,
  QueryClient: jest.fn(() => mockQueryClient),
  QueryClientProvider: ({ children }) => children,
  useInfiniteQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false
  }))
}))

// Mock React Hook Form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn((name) => ({ name, onChange: jest.fn(), onBlur: jest.fn() })),
    handleSubmit: (fn) => (e) => {
      e?.preventDefault?.()
      return fn({})
    },
    formState: { errors: {}, isSubmitting: false },
    setValue: jest.fn(),
    getValues: jest.fn(),
    watch: jest.fn(),
    reset: jest.fn(),
    clearErrors: jest.fn(),
    setError: jest.fn()
  }),
  Controller: ({ render, name }) => {
    const mockProps = {
      field: { name, value: '', onChange: jest.fn(), onBlur: jest.fn() },
      fieldState: { error: null },
      formState: { errors: {} }
    }
    return render(mockProps)
  }
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => {
  const mockIcon = (name) => {
    const Icon = (props) => <div data-testid={`icon-${name}`} {...props} />
    Icon.displayName = name
    return Icon
  }

  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return mockIcon(prop.toLowerCase())
      }
      return target[prop]
    }
  })
})

// Mock window objects that might be missing in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null }
  unobserve() { return null }
  disconnect() { return null }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null }
  unobserve() { return null }
  disconnect() { return null }
}

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  // Only mock console.error for React warnings we don't care about in tests
  console.error = (...args) => {
    if (
      args[0]?.includes?.('Warning: ReactDOM.render is no longer supported') ||
      args[0]?.includes?.('Warning: render is deprecated') ||
      args[0]?.includes?.('Warning: componentWillMount') ||
      args[0]?.includes?.('Warning: componentWillReceiveProps') ||
      args[0]?.includes?.('act()')
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (
      args[0]?.includes?.('componentWillMount') ||
      args[0]?.includes?.('componentWillReceiveProps')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.clear()
  sessionStorageMock.clear()
})

// Export utilities for tests
export {
  mockAuthContext,
  mockQueryClient,
  localStorageMock,
  sessionStorageMock
}