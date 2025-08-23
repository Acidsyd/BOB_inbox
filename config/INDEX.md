# Configuration Index

This directory contains all configuration files for the Mailsender project.

## Database Configuration
- [database_schema.sql](./database_schema.sql) - Main database schema definition
- [sample_data.sql](./sample_data.sql) - Sample data for testing and development
- [setup_database.sql](./setup_database.sql) - Database setup script
- [create-oauth2-tables.sql](./create-oauth2-tables.sql) - OAuth2 table creation

## Database Subdirectory
- [database/](./database/) - Additional database configuration files
  - [INDEX.md](./database/INDEX.md) - Database directory index
  - [campaign_automation_schema.sql](./database/campaign_automation_schema.sql) - Campaign automation schema
  - [init.sql](./database/init.sql) - Database initialization
  - [oauth2_migration.sql](./database/oauth2_migration.sql) - OAuth2 migration script

## Infrastructure Configuration
- [nginx/nginx.conf](./nginx/nginx.conf) - Nginx server configuration
- [playwright.config.ts](./playwright.config.ts) - Playwright testing configuration

## Usage Notes

These configuration files have been moved from the project root to maintain a cleaner project structure. When referencing these files from application code, use the path `config/filename.sql` or similar.

The database schema files should be applied in the following order for a fresh setup:
1. `database_schema.sql` - Core schema
2. `create-oauth2-tables.sql` - OAuth2 extensions
3. `sample_data.sql` - Test data (optional)