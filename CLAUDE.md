# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL INSTRUCTION: ALWAYS USE SPECIALIZED AGENTS

**YOU MUST ALWAYS TRY TO ASSIGN AGENT TASKS BEFORE DOING WORK YOURSELF.**

When any complex task is requested, immediately delegate to the appropriate specialized agent using the Task tool. Only perform simple, single-file operations yourself. For everything else, use the specialized agents listed in this document.

**Examples of when to use agents:**
- File cleanup/removal operations → Use general-purpose or refactor-pro agent
- Code refactoring → Use refactor-pro agent  
- Documentation updates → Use doc-keeper agent
- Database operations → Use supabase-master agent
- Testing → Use test-master agent
- Bug investigation → Use debug-detective agent
- Complex multi-step tasks → Use workflow-orchestrator agent

## Development Commands

### Backend (Node.js + Express)
```bash
cd backend
npm run dev              # Development server with nodemon
npm run start            # Production server
npm test                 # Run all test suites via custom runner
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:playwright  # Browser automation tests
npm run test:playwright:ui # Playwright UI mode
npm run test:playwright:debug # Playwright debug mode
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint validation
npm run lint:fix         # Auto-fix ESLint issues
npm run build            # TypeScript compilation
npm run worker           # Start worker process
npm run worker:dev       # Worker with nodemon
npm run worker:cluster   # Multi-worker orchestrator
```

### Frontend (Next.js 14)
```bash
cd frontend
npm run dev        # Development server (Next.js)
npm run build      # Production build
npm run start      # Production server
npm run lint       # Next.js linting
npm run type-check # TypeScript validation
npm test           # Jest tests
```

### Queue Workers (Specialized)
```bash
npm run worker:campaign  # Email campaign processing
npm run worker:leads     # Lead import and processing
npm run worker:emails    # Email delivery queue
npm run worker:analytics # Analytics and reporting
npm run worker:webhooks  # Webhook processing
```

### Testing Individual Components
```bash
# Run specific test file
cd backend && npm test -- tests/unit/queue/manager.test.js

# Run Playwright tests for specific feature
npm run test:playwright -- oauth2-flow.spec.js

# Run integration test with specific pattern
npm run test:integration -- --grep "campaign"
```

## Architecture Overview

### Core System Design
This is a **dual-architecture cold email automation platform** with:
- **Primary**: Production Supabase cloud database + OAuth2 Gmail API integration
- **Fallback**: Local development with queue-based processing

### Key Architectural Components

#### 1. Database Layer (Hybrid)
- **Primary**: Supabase (cloud PostgreSQL) with real-time subscriptions
- **Fallback**: Direct PostgreSQL connections with connection pooling
- **Queue Storage**: Redis with Bull MQ for job processing
- **Connection Management**: `src/database/connectionManager.js` handles automatic fallbacks

#### 2. API Automation (OAuth2 Integration)
- **OAuth2 Services**: Located in `src/services/OAuth2Service.js` file
- **Gmail API Integration**: Direct Gmail API access with domain-wide delegation
- **Campaign Generation**: Direct API integration based on campaign configuration
- **Token Management**: Automated OAuth2 token lifecycle management

#### 3. Queue Architecture
- **Manager**: `src/queue/manager.js` - centralized queue orchestration
- **Workers**: `src/workers/` - specialized processing (campaigns, leads, emails)
- **Processors**: `src/queue/processors/` - business logic for job types
- **Orchestration**: `src/orchestrator.js` - multi-worker coordination

#### 4. Real-time System
- **Service Manager**: `src/services/RealTimeServiceManager.js`
- **WebSocket Service**: `src/services/WebSocketService.js`
- **Progress Broadcasting**: `src/services/WebSocketProgressBroadcaster.js`
- **Error Notifications**: `src/services/ErrorNotificationService.js`

### Service Dependencies

#### Required Environment Setup
1. **Supabase**: Cloud database (see `docs/SUPABASE_SETUP_GUIDE.md`)
2. **Redis**: Local or cloud instance for queue processing
3. **OAuth2**: Gmail API integration with domain-wide delegation

#### OAuth2 Integration (Production Ready)
- **OAuth2 Service**: `src/services/OAuth2Service.js` - ✅ FULLY OPERATIONAL
- **Routes**: ✅ ALL ROUTES ACTIVE AND FUNCTIONAL (/api/oauth2/*)
- **Environment Setup**: ✅ All OAuth2 environment variables configured and working
- **Database Integration**: ✅ oauth2_tokens table with encrypted storage operational
- **Token Management**: ✅ Automatic refresh and lifecycle management working

### Frontend Architecture (Next.js 14)

#### State Management
- **React Query v5**: Global state and caching (`@tanstack/react-query`)
- **Optimistic Updates**: Real-time data reconciliation
- **Custom Hooks**: `hooks/useEmailAccounts.ts`, `hooks/useEmailAccountsSelection.ts`

#### Key Components
- **Authentication**: `components/auth/ProtectedRoute.tsx`
- **Layout**: `components/layout/AppLayout.tsx`, `components/layout/Sidebar.tsx`
- **UI Library**: Radix UI components in `components/ui/`

### Test Architecture

#### Playwright (Browser Testing)
- **Configuration**: `playwright.config.js` with multi-browser support
- **Test Helpers**: `tests/playwright/utils/test-helpers.js`
- **OAuth2 Tests**: `tests/playwright/oauth2-flow.spec.js`
- **Integration Tests**: `tests/playwright/integration-full.spec.js`

#### Backend Testing
- **Custom Runner**: `run-tests.js` handles ES module complexities
- **Unit Tests**: `tests/unit/` - isolated component testing
- **Integration Tests**: `tests/integration/` - full system testing
- **Performance Tests**: `tests/performance/` - load and stress testing

### Data Flow Patterns

#### Campaign Creation & Execution
1. **Frontend** → Campaign API (`src/routes/campaigns.js`)
2. **Campaign Service** → OAuth2 Service (`src/services/OAuth2Service.js`)
3. **Gmail API Integration** → Direct email sending activation
4. **Queue Processing** → Worker execution (`src/workers/`)
5. **Real-time Updates** → WebSocket broadcasting

#### Email Account Management
1. **Account Registration** → Database storage with health tracking
2. **OAuth2 Integration** → Token management (when enabled)
3. **Health Monitoring** → Real-time status updates
4. **Account Rotation** → Intelligent distribution in campaigns

### Critical Implementation Details

#### Connection Management
- `src/database/connectionManager.js` provides automatic fallback between Supabase and direct PostgreSQL
- Handles connection pooling, performance monitoring, and bulk operation optimization
- Automatically routes operations based on availability and performance

#### Queue Processing
- Uses Bull MQ with Redis for reliable job processing
- Supports priority queues, retries, and dead letter patterns
- Worker specialization for different job types (EMAIL_CAMPAIGN, LEAD_PROCESSING, etc.)

#### Real-time Features
- WebSocket connections for live updates (<100ms latency)
- Supabase real-time subscriptions for database changes
- Progress broadcasting for long-running operations

#### Error Handling
- Centralized error handling in `src/middleware/errorHandler.js`
- Service-specific error notifications via `src/services/ErrorNotificationService.js`
- Comprehensive logging with Winston in `src/utils/logger.js`

### Development Workflow

#### Starting the System
1. **Database**: Ensure Supabase is configured (see `docs/SUPABASE_SETUP_GUIDE.md`)
2. **Redis**: Start local Redis instance or configure cloud Redis
3. **Backend**: `npm run dev` starts API server with hot reload
4. **Workers**: `npm run worker:dev` for job processing
5. **Frontend**: `npm run dev` for Next.js development server

#### OAuth2 Development (PRODUCTION READY)
- **Production Integration**: ✅ Direct Gmail API access operational with secure token management
- **Local Development**: ✅ OAuth2Service fully functional for development and testing
- **Authentication Flow**: ✅ Complete OAuth2 flow tested and working end-to-end
- **Environment Setup**: ✅ All Google OAuth2 credentials configured and operational
- **Token Management**: ✅ Automatic token refresh, encryption/decryption working
- **Frontend Integration**: ✅ OAuth2 accounts displaying in email management interface

## Specialized Agents & Task Delegation

Use these agents via the Task tool for specialized work:

### 🧪 test-master
**Use for**: Comprehensive test suite generation with coverage analysis
- Creating full Playwright browser test suites for OAuth2 flows
- Unit/integration test generation for new features
- Cross-browser compatibility testing
- Performance testing and API endpoint validation
- Campaign workflow end-to-end testing

### 🐛 debug-detective  
**Use for**: Systematic error investigation and resolution
- Debugging OAuth2 authentication flow issues
- Investigating real-time WebSocket connection problems
- Analyzing OAuth2 API integration failures
- Troubleshooting Playwright test failures
- Performance issue investigation and memory leaks

### 🔧 refactor-pro
**Use for**: Code structure improvement without changing functionality
- Refactoring complex queue processors for better maintainability
- Improving service layer organization and SOLID principles
- Page Object Model implementation for Playwright tests
- Extract common patterns from OAuth2 service implementations
- Database connection management optimization

### 🗃️ supabase-master
**Use for**: Supabase database operations and management
- Database schema migrations and RLS policy setup
- Real-time subscription configuration
- User authentication and authorization setup
- Performance optimization of database queries

### 🌊 oauth2-integration-master
**Use for**: OAuth2 Gmail API integration and deployment
- Creating custom email campaign integrations
- Building lead processing with Gmail API
- OAuth2 authentication workflows
- Campaign performance tracking with direct API

### 📋 doc-keeper
**Use for**: Project documentation maintenance and file organization
- Updating project documentation after major changes
- Maintaining CHANGELOG.md and DEVELOPMENT_LOG.md
- Organizing file structures and fixing broken imports

### 🚀 pr-ready
**Use for**: Production-ready pull request preparation
- Complete feature implementation with tests and documentation
- Code review preparation with comprehensive validation
- Production deployment readiness assessment

### 🎼 workflow-orchestrator
**Use for**: Complex multi-agent coordination for large tasks
- Coordinating multiple agents for feature implementation
- Managing parallel development workstreams
- Large-scale refactoring with multiple specialized agents

## Available MCP (Model Context Protocol) Tools


### Supabase MCP
- **mcp__supabase-mcp__**: Database operations and management
  - `execute_sql` - Run raw SQL queries
  - `apply_migration` - Apply database migrations
  - `list_tables` - View database schema
  - `get_logs` - Debug application logs
  - `search_docs` - Search Supabase documentation

### Git MCP
- **mcp__git__**: Version control operations
  - `git_status` - Check repository status
  - `git_commit` - Create commits with proper messages
  - `git_push` - Push changes to remote
  - `git_branch` - Manage branches

### PostgreSQL MCP
- **mcp__postgres__**: Direct database operations
  - `query` - Execute SELECT statements
  - `execute` - Run INSERT/UPDATE/DELETE
  - `list_tables` - Show database structure
  - `describe_table` - Get table schema

### File System MCP
- **mcp__filesystem__**: File operations
  - `read_text_file` - Read file contents
  - `write_file` - Create/update files
  - `list_directory` - Browse directories
  - `search_files` - Find files by pattern

### Context7 Documentation MCP
- **mcp__context7_Docs__**: Access to Upstash Context7 documentation

## Documentation Files Reference

### Core Setup & Configuration
- `docs/SUPABASE_SETUP_GUIDE.md` - Complete Supabase setup instructions
- `docs/OAUTH2_SETUP_GUIDE.md` - Google OAuth2 integration setup
- `docs/DATABASE_SETUP_GUIDE.md` - Database schema and configuration
- `docs/DEPLOYMENT_GUIDE.md` - Production deployment instructions

### Architecture & Development
- `docs/OAUTH2_SETUP_GUIDE.md` - OAuth2 Gmail API integration architecture
- `docs/PRD_Cold_Email_Platform.md` - Product requirements document
- `docs/API_DOCUMENTATION.md` - Complete API reference
- `docs/DEVELOPMENT_LOG.md` - Development history and decisions
- `docs/PROJECT_STATUS.md` - Current project status and progress

### Implementation Details
- `docs/OAUTH2_SETUP_GUIDE.md` - OAuth2 Gmail API implementation
- `backend/REALTIME_IMPLEMENTATION_SUMMARY.md` - WebSocket and real-time features
- `backend/TESTING_SUMMARY.md` - Testing strategy and coverage
- `docs/PRODUCTION_READINESS_ASSESSMENT.md` - Production deployment readiness

### Specialized Agents
- `.claude/agents/test-master.md` - Testing agent capabilities
- `.claude/agents/debug-detective.md` - Debugging agent capabilities  
- `.claude/agents/refactor-pro.md` - Refactoring agent capabilities
- `.claude/agents/supabase-master.md` - Database agent capabilities
- `.claude/agents/oauth2-integration-master.md` - OAuth2 integration capabilities

### Migration & Backend
- `backend/migrations/README.md` - Database migration instructions
- `backend/DIRECT_CONNECTION_SETUP.md` - PostgreSQL connection setup
- `backend/TESTING_SUMMARY.md` - Backend testing framework