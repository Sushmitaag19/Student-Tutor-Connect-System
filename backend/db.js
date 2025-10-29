const { Pool } = require('pg');
require('dotenv').config({ path: './connection.env' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'Student_tutor',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Weareyes123',
    max: 20, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 5000,
};

console.log('📡 Initializing database connection with config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
});

const pool = new Pool(dbConfig);

// Test database connection on startup
pool.connect()
    .then(client => {
        console.log('✅ Database connected successfully');
        console.log('📊 Connection details:', {
            database: client.database,
            host: dbConfig.host,
            port: dbConfig.port
        });
        client.release();
    })
    .catch(err => {
        console.error('❌ Failed to connect to database:', err.message);
        console.error('💡 Please check:');
        console.error('   1. PostgreSQL is running');
        console.error('   2. Database "Student_tutor" exists');
        console.error('   3. Username and password in connection.env');
        console.error('   4. Server can access the database');
    });

pool.on('error', (err) => {
    console.error('❌ Unexpected database pool error:', err);
});

process.on('SIGINT', async () => {
    console.log('\n⚠️  Application shutting down...');
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
});

module.exports = pool;

