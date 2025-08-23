# PostgreSQL Connection Fix Guide for OPhir Project

## PROBLEM SUMMARY
The OPhir project has PostgreSQL connection issues due to:
1. **Authentication mismatch**: Backend expects passwordless connection but PostgreSQL requires authentication
2. **Missing database**: The `ophir_db` database doesn't exist
3. **User configuration**: Database user needs proper setup and permissions
4. **Environment inconsistency**: Docker vs local development configurations mismatch

## CURRENT STATUS
- ✅ PostgreSQL is running on localhost:5432
- ❌ Database `ophir_db` doesn't exist
- ❌ User authentication not properly configured
- ✅ Schema file ready in `/database/init.sql`
- ✅ Backend connection code fixed

## SOLUTIONS (Choose one)

### SOLUTION 1: Manual Database Setup (Recommended)

```bash
# 1. Connect to PostgreSQL as superuser (you'll need the postgres user password)
sudo -u postgres psql

# 2. Create database and user
CREATE DATABASE ophir_db;
CREATE USER ophir_user WITH PASSWORD 'ophir_password';
GRANT ALL PRIVILEGES ON DATABASE ophir_db TO ophir_user;
ALTER USER ophir_user CREATEDB;
\q

# 3. Initialize schema
PGPASSWORD="ophir_password" psql -h localhost -p 5432 -U ophir_user -d ophir_db -f database/init.sql
```

### SOLUTION 2: Reset PostgreSQL Authentication

If you have access to modify PostgreSQL configuration:

```bash
# 1. Find and edit pg_hba.conf (usually in /Library/PostgreSQL/12/data/)
# 2. Change authentication method to 'trust' for local connections temporarily
# 3. Restart PostgreSQL
# 4. Create database and user without password requirements
# 5. Reset authentication back to 'md5' or 'password'
```

### SOLUTION 3: Use Docker (Clean approach)

```bash
# 1. Install Docker if not available
# 2. Run from project root:
docker-compose up -d postgres
docker-compose exec postgres psql -U admin -d ophir_db -f /docker-entrypoint-initdb.d/init.sql

# 3. Update backend/.env to use Docker credentials:
DB_HOST=localhost
DB_USER=admin  
DB_PASSWORD=secure_password
```

## VERIFICATION

After setup, test the connection:

```bash
# Test direct PostgreSQL connection
PGPASSWORD="ophir_password" psql -h localhost -p 5432 -U ophir_user -d ophir_db -c "SELECT version();"

# Test backend connection (from backend directory)
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ophir_db',
  user: 'ophir_user',
  password: 'ophir_password'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ Connection failed:', err.message);
  else console.log('✅ Connection successful:', res.rows[0]);
  pool.end();
});
"
```

## FILES MODIFIED

1. **`/backend/.env`** - Updated database credentials:
   ```env
   DATABASE_URL=postgresql://ophir_user:ophir_password@localhost:5432/ophir_db
   DB_USER=ophir_user
   DB_PASSWORD=ophir_password
   ```

2. **`/backend/src/database/connection.ts`** - Fixed TypeScript syntax and defaults:
   ```typescript
   user: process.env.DB_USER || 'ophir_user',
   password: process.env.DB_PASSWORD || 'ophir_password',
   connectionTimeoutMillis: 5000, // Increased timeout
   ```

## CURRENT CONFIGURATION

**Database:** `ophir_db`
**User:** `ophir_user`  
**Password:** `ophir_password`
**Connection:** `postgresql://ophir_user:ophir_password@localhost:5432/ophir_db`

## TROUBLESHOOTING

### Common Issues:

1. **"password authentication failed"**
   - User doesn't exist or wrong password
   - Run: `sudo -u postgres createuser -P ophir_user`

2. **"database does not exist"**  
   - Run: `sudo -u postgres createdb ophir_db`
   - Grant permissions: `sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ophir_db TO ophir_user;"`

3. **"peer authentication failed"**
   - PostgreSQL is configured for peer authentication
   - Either use socket connection or modify pg_hba.conf

4. **Connection timeout**
   - PostgreSQL might not be accepting connections
   - Check: `netstat -an | grep 5432`
   - Verify postgresql.conf has `listen_addresses = '*'`

## NEXT STEPS

1. Choose and implement one of the solutions above
2. Test database connection using verification commands
3. Run backend server to confirm API can connect to database
4. Update SETUP_STATUS.md to reflect resolved status