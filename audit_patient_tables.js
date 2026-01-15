require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function run() {
    const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres' });
    try {
        await client.connect();
        const fs = require('fs');
        let output = '';
        const tables = ['clients', 'clinical_history', 'patient_treatments'];
        for (const table of tables) {
            const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
            const cols = res.rows.map(r => r.column_name).sort();
            output += `--- ${table} ---\n`;
            cols.forEach(c => output += `${c}\n`);
            output += `\n`;
        }
        fs.writeFileSync('schema_audit.txt', output);
        console.log('Audit written to schema_audit.txt');
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
