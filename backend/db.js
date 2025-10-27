const { Pool } = require('pg');
require('dotenv').config();

/**
 * Database Connection Pool
 * 
 * This module creates and exports a reusable PostgreSQL connection pool.
 * Connection pooling is essential for managing multiple concurrent database connections
 * efficiently without exhausting database resources.
 */

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'Student_tutor',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

/**
 * Test the database connection
 */
pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
    process.exit(-1);
});

/**
 * Graceful shutdown handler
 * Closes all database connections when the application terminates
 */
process.on('SIGINT', async () => {
    console.log('\n⚠️  Application shutting down...');
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
});

module.exports = pool;

