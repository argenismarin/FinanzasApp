import mysql from 'mysql2/promise';

const mysqlConfig = {
    host: 'srv1769.hstgr.io',
    port: 3306,
    user: 'u412677652_argema08',
    password: 'Yosoyargenis108$',
    database: 'u412677652_semanamineria'
};

async function exploreMySQLDatabase() {
    console.log('Conectando a MySQL...');

    const connection = await mysql.createConnection(mysqlConfig);

    try {
        // List all tables
        console.log('\n=== TABLAS EN LA BASE DE DATOS ===\n');
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tablas encontradas:', tables);

        // For each table, show structure and sample data
        for (const tableRow of tables as any[]) {
            const tableName = Object.values(tableRow)[0] as string;
            console.log(`\n=== TABLA: ${tableName} ===`);

            // Show structure
            const [columns] = await connection.query(`DESCRIBE ${tableName}`);
            console.log('Estructura:', columns);

            // Show sample data (first 5 rows)
            const [rows] = await connection.query(`SELECT * FROM ${tableName} LIMIT 10`);
            console.log(`Datos (primeros 10):`, rows);

            // Count total rows
            const [countResult] = await connection.query(`SELECT COUNT(*) as total FROM ${tableName}`);
            console.log('Total de registros:', (countResult as any[])[0].total);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
        console.log('\nConexión cerrada.');
    }
}

exploreMySQLDatabase();
