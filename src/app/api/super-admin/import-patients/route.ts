import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const tenantId = formData.get('tenantId') as string;
        const adminEmail = formData.get('adminEmail') as string;

        if (!file || !tenantId) {
            return NextResponse.json({ error: 'Archivo y tenantId son requeridos' }, { status: 400 });
        }

        // Read file as ArrayBuffer
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
            return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
        }

        const supabase = supabaseAdmin;

        // Map columns (flexible naming)
        const mapField = (row: any, ...names: string[]) => {
            for (const name of names) {
                const key = Object.keys(row).find(k =>
                    k.toLowerCase().includes(name.toLowerCase())
                );
                if (key && row[key]) return String(row[key]).trim();
            }
            return null;
        };

        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Extract fields with flexible column mapping
            const name = mapField(row, 'nombre', 'name', 'paciente', 'patient');
            const phone = mapField(row, 'telefono', 'phone', 'movil', 'tel', 'celular');
            const email = mapField(row, 'email', 'correo', 'mail');
            const dni = mapField(row, 'dni', 'nif', 'documento', 'id');
            const gender = mapField(row, 'genero', 'gender', 'sexo');
            const notes = mapField(row, 'notas', 'notes', 'observaciones', 'comentarios');
            const address = mapField(row, 'direccion', 'address', 'domicilio');
            const dob = mapField(row, 'fecha_nacimiento', 'nacimiento', 'birth', 'dob', 'fecha');

            // At minimum need a name or phone
            if (!name && !phone) {
                skipped++;
                continue;
            }

            // Clean phone (remove spaces, dashes)
            const cleanPhone = phone?.replace(/[\s\-\(\)]/g, '') || null;

            // Check for duplicates by phone or email
            if (cleanPhone || email) {
                const { data: existing } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('cliente_id', tenantId)
                    .or(cleanPhone ? `phone.eq.${cleanPhone}` : `email.eq.${email}`)
                    .limit(1);

                if (existing && existing.length > 0) {
                    skipped++;
                    continue;
                }
            }

            // Normalize gender
            let normalizedGender = null;
            if (gender) {
                const g = gender.toLowerCase();
                if (g.includes('m') || g.includes('hombre') || g.includes('male')) {
                    normalizedGender = 'masculino';
                } else if (g.includes('f') || g.includes('mujer') || g.includes('female')) {
                    normalizedGender = 'femenino';
                }
            }

            // Insert patient
            const { error } = await supabase.from('clients').insert({
                name: name || `Paciente ${cleanPhone || ''}`,
                phone: cleanPhone,
                email: email || null,
                dni: dni || null,
                gender: normalizedGender,
                notes: notes || null,
                address: address || null,
                date_of_birth: dob || null,
                status: 'lead',
                cliente_id: tenantId
            });

            if (error) {
                errors.push(`Fila ${i + 2}: ${error.message}`);
            } else {
                imported++;
            }
        }

        // Log the import
        await supabase.from('webhook_logs').insert({
            method: 'IMPORT_PATIENTS',
            url: '/api/super-admin/import-patients',
            body: { tenantId, adminEmail, imported, skipped, errors: errors.slice(0, 5) }
        });

        return NextResponse.json({
            success: true,
            imported,
            skipped,
            total: rows.length,
            errors: errors.slice(0, 5)
        });

    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
