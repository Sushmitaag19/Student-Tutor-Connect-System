const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'connection.env') });

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};

if (!dbConfig.host || !dbConfig.database || !dbConfig.user) {
    console.error('Missing required DB environment variables. Please set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in connection.env');
}

console.log('Initializing database connection with config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
});

const pool = new Pool(dbConfig);

if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(client => {
            console.log(' Database connected successfully');
            console.log('Connection details:', {
                database: client.database,
                host: dbConfig.host,
                port: dbConfig.port
            });
            client.release();
        })
        .catch(err => {
            console.error(' Failed to connect to database:', err.message);
            console.error(' Please check:');
            console.error('   1. PostgreSQL is running');
            console.error('   2. Database "Student_tutor" exists');
            console.error('   3. Username and password in connection.env');
            console.error('   4. Server can access the database');
        });
} else {
    // Skip establishing DB connection during Jest tests
}

pool.on('error', (err) => {
    console.error(' Unexpected database pool error:', err);
});

process.on('SIGINT', async () => {
    console.log('\n  Application shutting down...');
    await pool.end();
    console.log(' Database pool closed');
    process.exit(0);
});

module.exports = pool;

