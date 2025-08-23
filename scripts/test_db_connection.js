#!/usr/bin/env node

// PostgreSQL Connection Test Script for OPhir Project
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ophir_db',
  user: process.env.DB_USER || 'ophir_user',
  password: process.env.DB_PASSWORD || 'ophir_password',
  connectionTimeoutMillis: 5000,
};

console.log('🧪 Testing PostgreSQL connection for OPhir project...');
console.log('Configuration:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  Database: ${config.database}`);
console.log(`  User: ${config.user}`);
console.log(`  Password: ${'*'.repeat(config.password.length)}`);
console.log('');

async function testConnection() {
  const pool = new Pool(config);
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const client = await pool.connect();
    const versionResult = await client.query('SELECT version()');
    console.log('✅ Connection successful!');
    console.log(`   PostgreSQL version: ${versionResult.rows[0].version.split(' ')[1]}`);
    client.release();
    
    // Test database exists and is accessible
    console.log('');
    console.log('2. Testing database access...');
    const dbResult = await pool.query('SELECT current_database(), current_user');
    console.log('✅ Database access confirmed!');
    console.log(`   Current database: ${dbResult.rows[0].current_database}`);
    console.log(`   Current user: ${dbResult.rows[0].current_user}`);
    
    // Test schema exists
    console.log('');
    console.log('3. Checking database schema...');
    const schemaResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (schemaResult.rows.length > 0) {
      console.log('✅ Database schema exists!');
      console.log('   Tables found:');
      schemaResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  No tables found in database');
      console.log('   Schema may need to be initialized with: psql -U ophir_user -d ophir_db -f database/init.sql');
    }
    
    // Test a sample query
    console.log('');
    console.log('4. Testing sample query...');
    const nowResult = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Query execution successful!');
    console.log(`   Current time: ${nowResult.rows[0].current_time}`);
    
    await pool.end();
    
    console.log('');
    console.log('🎉 All database tests passed!');
    console.log('   Your PostgreSQL connection is ready for the OPhir backend.');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   🔍 PostgreSQL server is not running or not accepting connections');
    } else if (error.code === '28P01') {
      console.error('   🔍 Authentication failed - check username/password');
    } else if (error.code === '3D000') {
      console.error('   🔍 Database does not exist - create it first');
    }
    
    console.error('');
    console.error('📖 See DATABASE_SETUP_GUIDE.md for setup instructions');
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();