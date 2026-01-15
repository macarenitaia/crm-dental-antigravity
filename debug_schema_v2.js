require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectSchema() {
    console.log("Inspecting 'appointments' table...");
    const { data: appData, error: appError } = await supabase.from('appointments').select('*').limit(1);
    if (appError) {
        console.error("Error fetching appointments:", appError);
    } else {
        if (appData.length > 0) {
            console.log("Appointments Columns:", Object.keys(appData[0]));
        } else {
            console.log("Appointments table empty, cannot infer columns from data.");
            // Try to insert a dummy to get error or metadata? No, safe route.
            // We will assume 'client_id' exists based on existing code.
        }
    }

    console.log("Inspecting 'clients' table...");
    const { data: clientData, error: clientError } = await supabase.from('clients').select('*').limit(1);
    if (clientData && clientData.length > 0) {
        console.log("Clients Columns:", Object.keys(clientData[0]));
    }
}

inspectSchema();
