import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const SUPERADMIN_EMAIL = 'macarenita.ia@gmail.com';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tenantId, whatsappKeys, whatsappTemplates, userPrompt, adminEmail } = body;

        // 1. Basic Auth Check
        if (adminEmail !== SUPERADMIN_EMAIL) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'Falta Tenant ID' }, { status: 400 });
        }

        // 2. Perform Upserts in parallel/transaction
        // Note: For now we maintain backward compatibility with the JSONB column in 'tenants'
        const aiConfigJSONB = {
            whatsapp_keys: whatsappKeys,
            whatsapp_templates: whatsappTemplates,
            user_prompt: userPrompt
        };

        const results = await Promise.all([
            // Update legacy column
            supabaseAdmin
                .from('tenants')
                .update({ ai_config: aiConfigJSONB })
                .eq('id', tenantId),

            // Upsert into new whatsapp_settings
            supabaseAdmin
                .from('whatsapp_settings')
                .upsert({
                    tenant_id: tenantId,
                    phone_number_id: whatsappKeys.phone_id,
                    access_token: whatsappKeys.api_key,
                    template_name: whatsappTemplates.confirmation,
                    template_mapping: whatsappTemplates.mapping
                }, { onConflict: 'tenant_id' }),

            // Upsert into new ai_config_settings
            supabaseAdmin
                .from('ai_config_settings')
                .upsert({
                    tenant_id: tenantId,
                    custom_prompt: userPrompt
                }, { onConflict: 'tenant_id' })
        ]);

        // Check for any errors in results
        const errors = results.filter(res => res.error);
        if (errors.length > 0) {
            console.error('API Config Errors:', errors);
            return NextResponse.json({
                error: 'Error al guardar algunas configuraciones',
                details: errors.map(e => e.error?.message)
            }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Configuración guardada correctamente' });

    } catch (error: any) {
        console.error('API Config Exception:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
