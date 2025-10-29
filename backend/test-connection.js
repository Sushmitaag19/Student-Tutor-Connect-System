const pool = require('./db');

async function testConnection() {
    console.log('🧪 Starting database connection tests...\n');
    
    let client;
    
    try {
        console.log('Test 1: Testing database connection...');
        client = await pool.connect();
        console.log('✅ Connection established\n');
        client.release();
        
        console.log('Test 2: Querying database time...');
        const timeResult = await client.query('SELECT NOW() as current_time');
        console.log('✅ Current database time:', timeResult.rows[0].current_time, '\n');
        
        console.log('Test 3: Checking PostgreSQL version...');
        const versionResult = await client.query('SELECT version()');
        console.log('✅ PostgreSQL version:', versionResult.rows[0].version.split(' ').slice(0, 3).join(' '), '\n');
        
        console.log('Test 4: Checking database tables...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log('✅ Found tables:', tablesResult.rows.map(r => r.table_name).join(', '), '\n');
    
        console.log('Test 5: Checking for admin user...');
        const adminResult = await client.query(
            'SELECT user_id, full_name, email, role FROM users WHERE role = $1',
            ['admin']
        );
        
        if (adminResult.rows.length > 0) {
            console.log('✅ Admin user found:', adminResult.rows[0]);
        } else {
            console.log('⚠️  Admin user not found. Run database_setup.sql to initialize data');
        }
        console.log();
        
        console.log('Test 6: Counting total users...');
        const userCount = await client.query('SELECT COUNT(*) as count FROM users');
        console.log('✅ Total users:', userCount.rows[0].count, '\n');
        
        console.log('Test 7: Checking database structure...');
        const fkResult = await client.query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
        `);
        console.log('✅ Foreign key relationships found:', fkResult.rows.length);
        fkResult.rows.forEach((fk, idx) => {
            console.log(`   ${idx + 1}. ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
        console.log();
        
        console.log('🎉 All tests passed! Database connection is working correctly.\n');
        console.log('📊 Connection Summary:');
        console.log('   - Database: Student_tutor');
        console.log('   - Host: localhost');
        console.log('   - Port: 5432');
        console.log('   - Tables:', tablesResult.rows.map(r => r.table_name).length);
        console.log('   - Users:', userCount.rows[0].count);
        console.log('   - Status: ✅ Connected\n');
        
    } catch (error) {
        console.error('\n❌ Test failed with error:');
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.code);
        console.error('\n💡 Troubleshooting tips:');
        console.error('   1. Check if PostgreSQL is running');
        console.error('   2. Verify database "Student_tutor" exists');
        console.error('   3. Check credentials in connection.env');
        console.error('   4. Ensure database has correct schema');
        process.exit(1);
    } finally {
        if (client) {
            client.release();
        }
        await pool.end();
        console.log('📦 Connection pool closed');
    }
}

testConnection();


