/**
 * SEED DEMO / PRUEBA  —  Aprovisiona el entorno para la demo a clínicas.
 * =====================================================================
 * Trabaja sobre el TENANT QUE YA POSEE EL NÚMERO DE WHATSAPP DE PRODUCCIÓN
 * (porque reutilizamos ese número; webhook: phone_number_id -> 1 tenant).
 *
 * Es IDEMPOTENTE: se puede ejecutar varias veces sin duplicar.
 * Crea / garantiza:
 *   - Operador de login (Supabase Auth + fila en `users`)
 *   - 1 clínica (sede) si el tenant no tiene
 *   - 1 doctor + vínculo doctor_clinics (para auto-asignación en book_appointment)
 *   - Base de conocimiento (precios/horarios) con cliente_id del tenant
 *   - 1 paciente demo (opcional) para que el listado/calendario no estén vacíos
 *   - Verifica ai_config (whatsapp_keys + template confirmacion_cita)
 *
 * Uso:
 *   node scripts/seed_demo_prueba.js
 * Variables opcionales (.env.local):
 *   DEMO_TENANT_ID     -> fuerza el tenant (si no, se detecta por el phone_id)
 *   DEMO_LOGIN_EMAIL   -> email del operador (default demo@clinicaprueba.com)
 *   DEMO_LOGIN_PASSWORD-> contraseña del operador (default DemoDental2026!)
 *   DEMO_SEED_PATIENT  -> '0' para NO crear paciente demo
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
    console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
}
const supabase = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const LOGIN_EMAIL = process.env.DEMO_LOGIN_EMAIL || 'demo@clinicaprueba.com';
const LOGIN_PASSWORD = process.env.DEMO_LOGIN_PASSWORD || 'DemoDental2026!';
const SEED_PATIENT = process.env.DEMO_SEED_PATIENT !== '0';

const KNOWLEDGE_ITEMS = [
    'Los implantes dentales de titanio (gama alta) cuestan entre 1.200€ y 1.500€, incluyendo corona, revisión y limpieza.',
    'La ortodoncia invisible (Invisalign) cuesta entre 3.000€ y 4.500€ según la duración (Lite o Full).',
    'Hacemos blanqueamiento dental LED por 250€, con resultados en una sola sesión de 45 minutos.',
    'Una limpieza dental (higiene) cuesta 60€ y dura unos 30 minutos.',
    'Aceptamos financiación hasta 24 meses sin intereses.',
    'Horario: de Lunes a Viernes de 9:00 a 18:00.',
    'La primera visita de valoración y la radiografía panorámica son gratuitas para nuevos pacientes.',
    'Para urgencias (dolor agudo) intentamos dar cita el mismo día; la consulta de urgencia son 50€ (se descuenta si hay tratamiento).'
];

async function detectTenant() {
    if (process.env.DEMO_TENANT_ID) {
        const { data } = await supabase.from('tenants').select('*').eq('id', process.env.DEMO_TENANT_ID).single();
        if (!data) throw new Error(`DEMO_TENANT_ID ${process.env.DEMO_TENANT_ID} no existe`);
        return data;
    }
    const { data: tenants, error } = await supabase.from('tenants').select('*');
    if (error) throw error;

    const phoneId = process.env.WHATSAPP_PHONE_ID;
    // 1) por phone_id explícito del env
    let owner = phoneId && tenants.find(t => t.ai_config?.whatsapp_keys?.phone_id === phoneId);
    // 2) por cualquier tenant activo con phone_id configurado
    if (!owner) {
        const withPhone = tenants.filter(t => t.ai_config?.whatsapp_keys?.phone_id && t.active !== false);
        if (withPhone.length === 1) owner = withPhone[0];
        else if (withPhone.length > 1) {
            console.log('\n⚠️  Hay varios tenants con número WhatsApp configurado:');
            withPhone.forEach(t => console.log(`   - ${t.id}  ${t.nombre || t.name}  phone_id=${t.ai_config.whatsapp_keys.phone_id}`));
            throw new Error('Define DEMO_TENANT_ID para elegir uno.');
        }
    }
    if (!owner) {
        console.log('\nTenants disponibles:');
        tenants.forEach(t => console.log(`   - ${t.id}  ${t.nombre || t.name}  active=${t.active}  phone_id=${t.ai_config?.whatsapp_keys?.phone_id || '—'}`));
        throw new Error('No se detectó tenant con número WhatsApp. Define DEMO_TENANT_ID.');
    }
    return owner;
}

async function ensureOperator(tenant) {
    console.log('\n👤 Operador de login...');
    let authUserId = null;
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: LOGIN_EMAIL, password: LOGIN_PASSWORD, email_confirm: true
    });
    if (createErr) {
        if (/registered|already/i.test(createErr.message)) {
            // buscar existente
            let page = 1; let found = null;
            while (!found && page <= 10) {
                const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
                found = list?.users?.find(u => u.email?.toLowerCase() === LOGIN_EMAIL.toLowerCase());
                if (!list || list.users.length < 200) break;
                page++;
            }
            if (found) {
                authUserId = found.id;
                // resetea contraseña para que sea conocida en la demo
                await supabase.auth.admin.updateUserById(authUserId, { password: LOGIN_PASSWORD, email_confirm: true });
                console.log(`   ✓ Auth user ya existía, contraseña reseteada (${LOGIN_EMAIL})`);
            } else {
                throw new Error(`No se pudo crear ni localizar el auth user: ${createErr.message}`);
            }
        } else {
            throw createErr;
        }
    } else {
        authUserId = created.user.id;
        console.log(`   ✓ Auth user creado (${LOGIN_EMAIL})`);
    }

    // fila en users (vinculada al tenant)
    const { data: existingProfile } = await supabase.from('users').select('id').eq('auth_user_id', authUserId).maybeSingle();
    const profile = {
        auth_user_id: authUserId,
        email: LOGIN_EMAIL,
        name: 'Demo Recepción',
        role: 'admin',
        tenant_id: tenant.id
    };
    if (existingProfile) {
        await supabase.from('users').update(profile).eq('auth_user_id', authUserId);
        console.log('   ✓ Perfil users actualizado');
    } else {
        const { error } = await supabase.from('users').insert(profile);
        if (error) throw new Error(`users insert: ${error.message}`);
        console.log('   ✓ Perfil users creado');
    }
    return authUserId;
}

async function ensureClinic(tenant) {
    console.log('\n🏥 Clínica (sede)...');
    const { data: clinics } = await supabase.from('clinics').select('id, name').eq('cliente_id', tenant.id);
    if (clinics && clinics.length > 0) {
        console.log(`   ✓ Ya hay ${clinics.length} sede(s): ${clinics.map(c => c.name).join(', ')}`);
        return clinics[0].id;
    }
    const { data, error } = await supabase.from('clinics')
        .insert({ name: 'Clínica Demo', address: 'Calle Mayor 1, Madrid', cliente_id: tenant.id })
        .select('id').single();
    if (error) throw new Error(`clinics insert: ${error.message}`);
    console.log('   ✓ Sede "Clínica Demo" creada');
    return data.id;
}

async function ensureDoctor(tenant, clinicId) {
    console.log('\n👨‍⚕️ Doctor + vínculo...');
    let doctorId;
    const { data: docs } = await supabase.from('doctors').select('id, name').eq('cliente_id', tenant.id);
    if (docs && docs.length > 0) {
        doctorId = docs[0].id;
        console.log(`   ✓ Ya hay ${docs.length} doctor(es): ${docs.map(d => d.name).join(', ')}`);
    } else {
        const { data, error } = await supabase.from('doctors')
            .insert({ name: 'Dra. Sofía Demo', specialty: 'Odontología General', cliente_id: tenant.id })
            .select('id').single();
        if (error) throw new Error(`doctors insert: ${error.message}`);
        doctorId = data.id;
        console.log('   ✓ Doctor creado');
    }
    // vínculo doctor_clinics (defensivo: la tabla puede no existir en algún entorno)
    try {
        const { data: link } = await supabase.from('doctor_clinics')
            .select('doctor_id').eq('clinic_id', clinicId).eq('cliente_id', tenant.id).maybeSingle();
        if (!link) {
            const { error } = await supabase.from('doctor_clinics')
                .insert({ doctor_id: doctorId, clinic_id: clinicId, cliente_id: tenant.id });
            if (error) console.log(`   ⚠️ doctor_clinics: ${error.message} (no crítico)`);
            else console.log('   ✓ Vínculo doctor_clinics creado');
        } else {
            console.log('   ✓ Vínculo doctor_clinics ya existe');
        }
    } catch (e) {
        console.log(`   ⚠️ doctor_clinics no disponible: ${e.message} (no crítico)`);
    }
    return doctorId;
}

async function ensureKnowledge(tenant) {
    console.log('\n📚 Base de conocimiento (precios/horarios)...');
    const { count } = await supabase.from('knowledge_base')
        .select('id', { count: 'exact', head: true }).eq('cliente_id', tenant.id);
    if (count && count > 0) {
        console.log(`   ✓ Ya hay ${count} entradas para este tenant`);
        return;
    }
    const geminiKey = process.env.GEMINI_API_KEY;
    let model = null;
    if (geminiKey) {
        try {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            model = new GoogleGenerativeAI(geminiKey).getGenerativeModel({ model: 'text-embedding-004' });
        } catch (e) { console.log(`   ⚠️ Gemini no disponible (${e.message}); insertando sin embedding`); }
    } else {
        console.log('   ⚠️ Sin GEMINI_API_KEY; insertando sin embedding (la búsqueda por tenant es textual y funciona igual)');
    }
    let ok = 0;
    for (const text of KNOWLEDGE_ITEMS) {
        let embedding = null;
        if (model) {
            try { embedding = (await model.embedContent(text)).embedding.values; } catch { /* sigue sin embedding */ }
        }
        const row = { content: text, cliente_id: tenant.id, metadata: { source: 'seed_demo_prueba' } };
        if (embedding) row.embedding = embedding;
        const { error } = await supabase.from('knowledge_base').insert(row);
        if (error) { console.log(`   ⚠️ ${error.message}`); }
        else ok++;
        if (model) await new Promise(r => setTimeout(r, 300));
    }
    console.log(`   ✓ ${ok}/${KNOWLEDGE_ITEMS.length} entradas insertadas`);
}

async function ensureDemoPatient(tenant) {
    if (!SEED_PATIENT) return;
    console.log('\n🧑 Paciente demo...');
    const wid = '34600000001';
    const { data: existing } = await supabase.from('clients').select('id').eq('whatsapp_id', wid).maybeSingle();
    if (existing) { console.log('   ✓ Paciente demo ya existe'); return; }
    const { error } = await supabase.from('clients').insert({
        name: 'Paciente Demo', whatsapp_id: wid, phone: wid,
        email: 'paciente.demo@email.com', cliente_id: tenant.id, status: 'client'
    });
    if (error) console.log(`   ⚠️ ${error.message}`);
    else console.log('   ✓ Paciente demo creado');
}

function checkWhatsappConfig(tenant) {
    console.log('\n📱 Configuración WhatsApp del tenant...');
    const wk = tenant.ai_config?.whatsapp_keys || {};
    const tmpl = tenant.ai_config?.whatsapp_templates || {};
    const token = wk.access_token || wk.api_key;
    console.log(`   phone_id:   ${wk.phone_id || '❌ FALTA'}`);
    console.log(`   token:      ${token ? 'OK' : '❌ FALTA (access_token/api_key)'}`);
    console.log(`   template:   ${tmpl.confirmation || '❌ FALTA (esperado: confirmacion_cita)'}`);
    console.log(`   mapping:    ${tmpl.mapping ? 'OK' : '(usará el mapping por defecto header=[patient_name], body=[date,time])'}`);
    if (!wk.phone_id || !token) {
        console.log('   ⚠️ Sin phone_id/token NO se enviarán mensajes reales. Complétalos en tenants.ai_config (SuperAdmin > config).');
    }
}

async function main() {
    console.log('🚀 SEED DEMO / PRUEBA');
    console.log('=====================');
    const tenant = await detectTenant();
    console.log(`\n🏢 Tenant de la demo: ${tenant.nombre || tenant.name}  (${tenant.id})  active=${tenant.active}`);

    await ensureOperator(tenant);
    const clinicId = await ensureClinic(tenant);
    await ensureDoctor(tenant, clinicId);
    await ensureKnowledge(tenant);
    await ensureDemoPatient(tenant);
    checkWhatsappConfig(tenant);

    console.log('\n========================================');
    console.log('✅ LISTO. Credenciales de login para la demo:');
    console.log(`   URL:   ${process.env.NEXT_PUBLIC_APP_URL || 'https://<tu-deploy>'} /login`);
    console.log(`   Email: ${LOGIN_EMAIL}`);
    console.log(`   Pass:  ${LOGIN_PASSWORD}`);
    console.log(`   Tenant: ${tenant.nombre || tenant.name} (${tenant.id})`);
    console.log('========================================\n');
}

main().catch(e => { console.error('\n❌ ERROR:', e.message); process.exit(1); });
