/**
 * Script to check if the subjects column exists in the students table
 * Run: node check-db-schema.js
 */

const pool = require('./db');

async function checkSchema() {
    const client = await pool.connect();
    
    try {
        // Check if subjects column exists
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'students' AND column_name = 'subjects'
        `);
        
        if (result.rows.length > 0) {
            console.log('subjects column exists in students table');
            console.log('   Type:', result.rows[0].data_type);
        } else {
            console.log(' subjects column does NOT exist in students table');
            console.log('   Please run: backend/migration_add_subjects_column.sql');
            
            // Show all columns in students table
            const allColumns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'students'
                ORDER BY ordinal_position
            `);
            
            console.log('\n   Current columns in students table:');
            allColumns.rows.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
        }
        
        // Check students table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'students'
            )
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('\n students table does not exist!');
            console.log('   Please run: backend/database_setup.sql');
        } else {
            console.log('\n students table exists');
        }
        
    } catch (error) {
        console.error(' Error checking schema:', error.message);
        console.error('   Make sure your database is running and connected');
    } finally {
        client.release();
        await pool.end();
    }
}

checkSchema();

