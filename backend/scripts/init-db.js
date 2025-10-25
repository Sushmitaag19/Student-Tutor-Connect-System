const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Connect to default postgres database first
  password: process.env.DB_PASSWORD || 'mypassword',
  port: process.env.DB_PORT || 5432,
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create database if it doesn't exist
    await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'Student_tutor'}`);
    console.log('Database created successfully');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('Database already exists');
    } else {
      console.error('Error creating database:', error);
    }
  } finally {
    client.release();
  }
  
  await pool.end();
}

// Run the initialization
initializeDatabase().catch(console.error);
