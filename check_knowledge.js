/**
 * Verificar estructura de tabla knowledge_base
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKnowledgeTable() {
    console.log('=== CHECKING KNOWLEDGE TABLE ===\n');

    // Try to query knowledge_base table
    const { data, error } = await supabase.from('knowledge_base').select('*').limit(1);

    if (error) {
        console.log('❌ Error:', error.message);
        console.log('\nLa tabla knowledge_base puede no existir. Necesitamos crearla.');
    } else {
        console.log('✅ Tabla existe');
        if (data && data.length > 0) {
            console.log('Columnas:', Object.keys(data[0]));
        } else {
            console.log('Tabla vacía');
        }
    }

    // Check count
    const { count } = await supabase.from('knowledge_base').select('*', { count: 'exact', head: true });
    console.log(`Total registros: ${count || 0}`);
}

checkKnowledgeTable().catch(console.error);
