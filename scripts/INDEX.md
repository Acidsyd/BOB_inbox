# Scripts Index

This directory contains utility scripts and tools for the Mailsender project.

## Database Management Scripts
- [apply-oauth2-migration.js](./apply-oauth2-migration.js) - Apply OAuth2 database migrations
- [apply-oauth2-migration-direct.js](./apply-oauth2-migration-direct.js) - Direct OAuth2 migration
- [apply-sql.js](./apply-sql.js) - General SQL script execution
- [complete-oauth2-migration.js](./complete-oauth2-migration.js) - Complete OAuth2 migration process
- [check-database.js](./check-database.js) - Database connectivity and status check
- [test_db_connection.js](./test_db_connection.js) - Test database connection

## User Management Scripts
- [setup-admin-demo-user.js](./setup-admin-demo-user.js) - Create admin demo user
- [check-admin-user.js](./check-admin-user.js) - Verify admin user exists
- [configure-email-credentials.js](./configure-email-credentials.js) - Configure email account credentials

## Testing and Development Scripts
- [test-login.js](./test-login.js) - Test user authentication
- [test-oauth2.js](./test-oauth2.js) - Test OAuth2 integration
- [scrape-linkedin.js](./scrape-linkedin.js) - LinkedIn data scraping utility

## System Scripts
- [start-local.sh](./start-local.sh) - Start local development environment
- [fix_postgresql.sh](./fix_postgresql.sh) - PostgreSQL troubleshooting script

## Test Files
- [tests/](./tests/) - Standalone test files moved from root
  - [example.spec.ts](./tests/example.spec.ts) - Example test specification
  - [linkedin-scrape.spec.ts](./tests/linkedin-scrape.spec.ts) - LinkedIn scraping tests

## Usage Notes

These scripts have been moved from the project root to maintain better organization. Most scripts should be run from the project root directory using:

```bash
node scripts/script-name.js
```

For shell scripts:
```bash
bash scripts/script-name.sh
```

Some database scripts may require environment variables to be set. Check individual script files for specific requirements.

## Security Note

Several of these scripts interact with production databases and external APIs. Ensure you have proper environment configuration and permissions before running them in production environments.