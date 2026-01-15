
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// Seed Data
const KNOWLEDGE_ITEMS = [
    "Los implantes dentales de titanio (gama alta) cuestan entre 1.200€ y 1.500€, incluyendo corona. Incluye revisión y limpieza.",
    "La ortodoncia invisible (Invisalign) suele costar entre 3.000€ y 4.500€ dependiendo de la duración (Lite o Full).",
    "Realizamos blanqueamientos dentales LED por 250€, se ven resultados en una sola sesión de 45 minutos.",
    "Aceptamos financiación hasta 24 meses sin intereses con Santander Consumer y Sabadell.",
    "El horario de la clínica es de Lunes a Viernes de 9:00 a 21:00 ininterrumpido. Sábados de 9:00 a 14:00.",
    "Para urgencias dentales (dolor agudo), intentamos dar cita en el mismo día. La consulta de urgencia son 50€ (se descuenta si hay tratamiento).",
    "La primera visita de valoración y el TAC / Radiografía panorámica son gratuitos para nuevos pacientes.",
    "Trabajamos con las aseguradoras: Sanitas, Adeslas, Asisa y Mapfre (solo cuadro médico básico, no dental completo, consultar en recepción)."
];

async function main() {
    // Dynamic import to prevent hoisting issues
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    // Connect DB direct (or via ADMIN API)
    // We can use Supabase client directly if we have the key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const GeminiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !GeminiKey) {
        console.error("Missing Env Vars (SUPABASE_URL, KEY or GEMINI_API_KEY)");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(GeminiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    console.log(`🚀 Seeding ${KNOWLEDGE_ITEMS.length} items to Knowledge Base...`);

    for (const text of KNOWLEDGE_ITEMS) {
        // Check if exists roughly (optional, but good to avoid dupes in simplistic seed)
        // Skip check to keep it simple, just insert.

        console.log(`Generating embedding for: "${text.substring(0, 30)}..."`);

        try {
            const result = await model.embedContent(text);
            const embedding = result.embedding.values; // Array of numbers

            const { error } = await supabase.from('knowledge_base').insert({
                content: text,
                embedding: embedding,
                metadata: { source: 'seed_script' }
            });

            if (error) console.error("Error inserting:", error.message);
            else console.log("✅ Inserted.");

        } catch (e) {
            console.error("Embedding API Error:", e);
        }

        // Rate limit guard
        await new Promise(r => setTimeout(r, 500));
    }

    console.log("✨ Seeding Complete.");
}

main();
