# CLAUDE.md

This file provides guidance to Claude Code when working with the Mailsender project.

## Development Commands

### Backend
```bash
cd backend
npm run dev              # Development server
npm run start            # Production server
npm test                 # Run tests
npm run build            # TypeScript compilation
```

### Frontend
```bash
cd frontend
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server
npm test           # Jest tests
```

## Architecture Overview

This is a **cold email automation platform** with:
- **Database**: Supabase (cloud PostgreSQL)
- **Frontend**: Next.js 14 with React Query
- **Backend**: Node.js + Express with OAuth2 Gmail integration
- **Queue**: Redis with Bull MQ for job processing

### Key Files
- `src/services/OAuth2Service.js` - Gmail API integration
- `src/database/connectionManager.js` - Database connections
- `src/queue/manager.js` - Queue orchestration
- `src/services/WebSocketService.js` - Real-time updates

## Environment Setup
1. **Supabase**: See `docs/SUPABASE_SETUP_GUIDE.md`
2. **Redis**: Local or cloud instance
3. **OAuth2**: Gmail API credentials

## Development Workflow
1. Start Supabase database
2. Start Redis instance
3. Run `npm run dev` in backend
4. Run `npm run dev` in frontend

## Core Documentation
- `README.md` - Main project documentation
- `docs/API_DOCUMENTATION.md` - API reference
- `docs/SUPABASE_SETUP_GUIDE.md` - Database setup