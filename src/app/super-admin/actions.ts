"use server";

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

const SUPERADMIN_EMAIL = 'macarenita.ia@gmail.com';

async function checkSuperAdmin(userEmail?: string) {
    if (userEmail !== SUPERADMIN_EMAIL) {
        throw new Error('No autorizado');
    }
}

// 1. Create a New Tenant (Client) AND its Primary Clinic
export async function createTenantAction(formData: FormData, adminEmail: string) {
    await checkSuperAdmin(adminEmail);

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const address = formData.get('address') as string;
    const cif = formData.get('cif') as string;
    const postal_code = formData.get('postal_code') as string;

    // 1. Create Tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert({
            nombre: name,
            email: email || null,
            plan: 'pro',
            active: true,
            cif: cif,
            postal_code: postal_code,
            address: address
        })
        .select()
        .single();

    if (tenantError) throw new Error(`Error creando Tenant: ${tenantError.message}`);

    // 2. Create Primary Clinic linked to Tenant
    const { error: clinicError } = await supabaseAdmin
        .from('clinics')
        .insert({
            name: `${name} - Sede Principal`,
            address: address,
            tenant_id: tenant.id,
            cliente_id: tenant.id,
            cif: cif,
            postal_code: postal_code
        });

    if (clinicError) {
        throw new Error(`Error creando Sede: ${clinicError.message}`);
    }

    revalidatePath('/super-admin');
    return { success: true };
}

// 2. Create a User linked to a Tenant
export async function createUserAction(formData: FormData, adminEmail: string) {
    await checkSuperAdmin(adminEmail);

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const tenantId = formData.get('tenantId') as string;

    if (!tenantId) throw new Error('Debe seleccionar un Cliente/Tenant');

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
    });

    if (authError) throw new Error(`Error Auth: ${authError.message}`);

    const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
            auth_user_id: authData.user.id,
            email,
            name,
            role: 'admin',
            tenant_id: tenantId
        });

    if (userError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Error DB User: ${userError.message}`);
    }

    revalidatePath('/super-admin');
    return { success: true };
}

// 3. Update AI Config for Tenant
export async function updateTenantAIConfigAction(tenantId: string, aiConfig: any, adminEmail: string) {
    await checkSuperAdmin(adminEmail);

    const { error } = await supabaseAdmin
        .from('tenants')
        .update({ ai_config: aiConfig })
        .eq('id', tenantId);

    if (error) throw new Error(`Error actualizando IA: ${error.message}`);

    revalidatePath('/super-admin');
    return { success: true };
}

// 4. Manage Clinic (Update google_review_link)
export async function updateClinicSuperAction(clinicId: string, data: any, adminEmail: string) {
    await checkSuperAdmin(adminEmail);

    const { error } = await supabaseAdmin
        .from('clinics')
        .update(data)
        .eq('id', clinicId);

    if (error) throw new Error(`Error actualizando Sede: ${error.message}`);

    revalidatePath('/super-admin');
    return { success: true };
}

// 4b. Create Clinic
export async function createClinicSuperAction(formData: FormData, adminEmail: string) {
    await checkSuperAdmin(adminEmail);

    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const cif = formData.get('cif') as string;
    const city = formData.get('city') as string;
    const postal_code = formData.get('postal_code') as string;
    const province = formData.get('province') as string;
    const phone = formData.get('phone') as string;
    const google_review_link = formData.get('google_review_link') as string;
    const tenantId = formData.get('tenantId') as string;

    if (!tenantId) throw new Error('Debe seleccionar un Cliente/Tenant');

    const { error } = await supabaseAdmin
        .from('clinics')
        .insert({
            name,
            address,
            cif,
            city,
            postal_code,
            province,
            phone,
            google_review_link,
            cliente_id: tenantId,
            tenant_id: tenantId
        });

    if (error) throw new Error(`Error creando Sede: ${error.message}`);

    revalidatePath('/super-admin');
    return { success: true };
}

// 4c. Create Doctor
export async function createDoctorSuperAction(formData: FormData, adminEmail: string) {
    await checkSuperAdmin(adminEmail);

    const name = formData.get('name') as string;
    const specialty = formData.get('specialty') as string;
    const tenantId = formData.get('tenantId') as string;
    const clinicId = formData.get('clinicId') as string;

    if (!tenantId) throw new Error('Debe seleccionar un Cliente/Tenant');

    // 1. Create Doctor
    const { data: doctor, error: doctorError } = await supabaseAdmin
        .from('doctors')
        .insert({
            name,
            specialty,
            cliente_id: tenantId,
            is_active: true
        })
        .select()
        .single();

    if (doctorError) throw new Error(`Error creando Doctor: ${doctorError.message}`);

    // 2. Link to Clinic if provided
    if (clinicId) {
        const { error: linkError } = await supabaseAdmin
            .from('doctor_clinics')
            .insert({
                doctor_id: doctor.id,
                clinic_id: clinicId,
                cliente_id: tenantId
            });

        if (linkError) {
            console.error('Error linking doctor to clinic:', linkError);
            // Non-critical error, doctor was created
        }
    }

    revalidatePath('/super-admin');
    return { success: true };
}

// 4d. Delete Doctor
export async function deleteDoctorSuperAction(doctorId: string, adminEmail: string) {
    console.log(`[SuperAdmin] Attempting to delete doctor ${doctorId} by ${adminEmail}`);
    await checkSuperAdmin(adminEmail);

    // 1. Delete links in doctor_clinics
    const { error: linksError } = await supabaseAdmin
        .from('doctor_clinics')
        .delete()
        .eq('doctor_id', doctorId);

    if (linksError) {
        console.error('[SuperAdmin] Error deleting doctor_clinics links:', linksError);
    }

    // 2. Delete Doctor
    const { error } = await supabaseAdmin
        .from('doctors')
        .delete()
        .eq('id', doctorId);

    if (error) {
        console.error('[SuperAdmin] Error deleting doctor:', error);
        throw new Error(`Error eliminando Doctor: ${error.message}`);
    }

    console.log(`[SuperAdmin] Doctor ${doctorId} deleted successfully`);
    revalidatePath('/super-admin');
    return { success: true };
}

// 5. Manage Treatment (Upsert)
export async function upsertTreatmentAction(treatmentData: any, adminEmail: string) {
    await checkSuperAdmin(adminEmail);
    console.log('[SuperAdmin Action] upsertTreatment data:', treatmentData);

    const { error } = await supabaseAdmin
        .from('tratamientos_new')
        .upsert(treatmentData);

    if (error) {
        console.error('[SuperAdmin Action] upsertTreatment error:', error);
        throw new Error(`Error en Tratamiento: ${error.message}`);
    }

    console.log('[SuperAdmin Action] upsertTreatment SUCCESS');
    revalidatePath('/super-admin');
    return { success: true };
}

// 6. Fetch Data for Dashboard
export async function getSuperAdminData(adminEmail: string) {
    await checkSuperAdmin(adminEmail);

    const [tenantsRes, clinicsRes, usersRes, treatmentsRes, doctorsRes] = await Promise.all([
        supabaseAdmin.from('tenants').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('clinics').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('tratamientos_new').select('*').order('nombre', { ascending: true }),
        supabaseAdmin.from('doctors').select('*').order('name', { ascending: true })
    ]);

    return {
        tenants: tenantsRes.data || [],
        clinics: clinicsRes.data || [],
        users: usersRes.data || [],
        treatments: treatmentsRes.data || [],
        doctors: doctorsRes.data || []
    };
}
