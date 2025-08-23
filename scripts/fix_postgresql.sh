#!/bin/bash

# PostgreSQL Connection Fix Script for OPhir Project
echo "=== OPhir PostgreSQL Connection Fix ==="

# Check if PostgreSQL is running
if ! pgrep -f "postgres" > /dev/null; then
    echo "❌ PostgreSQL is not running"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Try to connect and create database/user
echo "🔧 Setting up database and user..."

# Option 1: Try with system postgres user (may require sudo)
echo "Trying to setup database with postgres superuser..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ophir_db;" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE ophir_db;" 2>/dev/null
sudo -u postgres psql -c "DROP USER IF EXISTS ophir_user;" 2>/dev/null  
sudo -u postgres psql -c "CREATE USER ophir_user WITH PASSWORD 'ophir_password';" 2>/dev/null
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ophir_db TO ophir_user;" 2>/dev/null
sudo -u postgres psql -c "ALTER USER ophir_user CREATEDB;" 2>/dev/null

# Option 2: Try with current user if Option 1 fails
if [ $? -ne 0 ]; then
    echo "Trying alternative setup method..."
    
    # Create .pgpass file for authentication
    echo "localhost:5432:*:$(whoami):" > ~/.pgpass
    chmod 600 ~/.pgpass
    
    # Try to create database with current user
    createdb ophir_db 2>/dev/null
fi

# Test connection
echo "🧪 Testing database connection..."
if PGPASSWORD="ophir_password" psql -h localhost -p 5432 -U ophir_user -d ophir_db -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Database connection successful!"
    
    # Run schema initialization
    echo "📋 Initializing database schema..."
    PGPASSWORD="ophir_password" psql -h localhost -p 5432 -U ophir_user -d ophir_db -f database/init.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ Database schema initialized successfully!"
    else
        echo "⚠️  Schema initialization failed, but database is ready"
    fi
    
    # Update environment configuration
    echo "🔧 Updating backend configuration..."
    sed -i.bak 's/DB_USER=.*/DB_USER=ophir_user/' backend/.env
    sed -i.bak 's/DB_PASSWORD=.*/DB_PASSWORD=ophir_password/' backend/.env
    sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgresql://ophir_user:ophir_password@localhost:5432/ophir_db|' backend/.env
    
    echo "✅ Configuration updated!"
    echo ""
    echo "🎉 PostgreSQL setup complete!"
    echo "   Database: ophir_db"
    echo "   User: ophir_user"
    echo "   Password: ophir_password"
    echo "   Connection: postgresql://ophir_user:ophir_password@localhost:5432/ophir_db"
    
else
    echo "❌ Database connection failed"
    echo ""
    echo "🚨 MANUAL SETUP REQUIRED:"
    echo "   1. Connect to PostgreSQL as superuser"
    echo "   2. Run: CREATE DATABASE ophir_db;"
    echo "   3. Run: CREATE USER ophir_user WITH PASSWORD 'ophir_password';"
    echo "   4. Run: GRANT ALL PRIVILEGES ON DATABASE ophir_db TO ophir_user;"
    echo "   5. Run the schema: psql -U ophir_user -d ophir_db -f database/init.sql"
    
    exit 1
fi