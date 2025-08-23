-- Database setup script for OPhir project
-- Run this as a PostgreSQL superuser

-- Create database
DROP DATABASE IF EXISTS ophir_db;
CREATE DATABASE ophir_db;

-- Create user with password
DROP USER IF EXISTS ophir_user;
CREATE USER ophir_user WITH PASSWORD 'ophir_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ophir_db TO ophir_user;
ALTER USER ophir_user CREATEDB;

-- Connect to the new database and run init script
\c ophir_db;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO ophir_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ophir_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ophir_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ophir_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ophir_user;