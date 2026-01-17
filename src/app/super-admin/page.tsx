"use client";

import { useState, useEffect, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
    Shield, Building, UserPlus, List, Activity,
    CheckCircle2, AlertCircle, LayoutDashboard,
    Bot, MessageSquare, Stethoscope, Briefcase,
    Globe, Save, Edit3, Plus, Trash2, ChevronRight, Upload, FileSpreadsheet
} from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import {
    createTenantAction,
    createUserAction,
    getSuperAdminData,
    updateTenantAIConfigAction,
    updateClinicSuperAction,
    createClinicSuperAction,
    createDoctorSuperAction,
    deleteDoctorSuperAction,
    upsertTreatmentAction
} from './actions';

export default function SuperAdminPage() {
    const { user, loading: authLoading, isSuperAdmin } = useTenant();
    const [data, setData] = useState<{
        tenants: any[],
        clinics: any[],
        users: any[],
        treatments: any[],
        doctors: any[]
    }>({ tenants: [], clinics: [], users: [], treatments: [], doctors: [] });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'onboarding' | 'config' | 'operations'>('onboarding');
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // AI Config Form State
    const [aiConfig, setAiConfig] = useState<any>({
        whatsapp_keys: { api_key: '', phone_id: '' },
        whatsapp_templates: { confirmation: 'confirmacion_cita', mapping: {} },
        user_prompt: ''
    });
    const [mappingString, setMappingString] = useState('{}');
    const [watchTenantId, setWatchTenantId] = useState('');
    const [watchClinicId, setWatchClinicId] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<any>(null);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        if (isSuperAdmin) {
            refreshData();
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (selectedTenantId) {
            const tenant = data.tenants.find(t => t.id === selectedTenantId);
            if (tenant?.ai_config) {
                setAiConfig(tenant.ai_config);
                setMappingString(JSON.stringify(tenant.ai_config.whatsapp_templates?.mapping || {}, null, 2));
            } else {
                setAiConfig({
                    whatsapp_keys: { api_key: '', phone_id: '' },
                    whatsapp_templates: { confirmation: 'confirmacion_cita', mapping: {} },
                    user_prompt: ''
                });
                setMappingString('{}');
            }
        }
    }, [selectedTenantId, data.tenants]);

    async function refreshData() {
        setLoading(true);
        try {
            const res = await getSuperAdminData(user!.email);
            setData(res);
            if (!selectedTenantId && res.tenants.length > 0) {
                setSelectedTenantId(res.tenants[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (authLoading) return <div className="p-8 flex items-center gap-3"><Activity className="animate-spin text-emerald-600" /> Cargando...</div>;

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
                <Shield size={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Acceso Restringido</h1>
                <p className="text-gray-500 mt-2">Solo el SuperAdmin puede acceder a esta sección.</p>
            </div>
        );
    }

    const handleSaveAIConfig = async () => {
        if (!selectedTenantId) return;
        setLoading(true);
        try {
            let parsedMapping = {};
            try {
                parsedMapping = JSON.parse(mappingString);
            } catch (e) {
                throw new Error('El JSON de mapeo es inválido. Verifica comas y comillas.');
            }

            const response = await fetch('/api/super-admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: selectedTenantId,
                    whatsappKeys: aiConfig.whatsapp_keys,
                    whatsappTemplates: {
                        ...aiConfig.whatsapp_templates,
                        mapping: parsedMapping
                    },
                    userPrompt: aiConfig.user_prompt,
                    adminEmail: user!.email
                })
            });

            const resData = await response.json();
            if (!response.ok) throw new Error(resData.error || 'Error al guardar configuración');

            setMessage({ type: 'success', text: 'Configuración de IA y Mapeo guardados con éxito en base de datos' });
            refreshData();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateClinic = async (clinicId: string, googleLink: string) => {
        try {
            await updateClinicSuperAction(clinicId, { google_review_link: googleLink }, user!.email);
            setMessage({ type: 'success', text: 'Sede actualizada' });
            refreshData();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleDeleteDoctor = async (doctorId: string) => {
        if (!confirm('¿Estás seguro de eliminar este doctor y todas sus vinculaciones?')) return;
        setLoading(true);
        try {
            console.log('Calling deleteDoctorSuperAction for:', doctorId);
            const res = await deleteDoctorSuperAction(doctorId, user!.email);
            if (res.success) {
                setMessage({ type: 'success', text: 'Doctor eliminado correctamente' });
                await refreshData();
            }
        } catch (err: any) {
            console.error('Error in handleDeleteDoctor:', err);
            setMessage({ type: 'error', text: `No se pudo eliminar: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleUpsertTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const treatment = {
            id: fd.get('id') || undefined,
            nombre: fd.get('nombre'),
            description: fd.get('description'),
            price: parseFloat(fd.get('price') as string),
            cliente_id: selectedTenantId
        };
        try {
            await upsertTreatmentAction(treatment, user!.email);
            setMessage({ type: 'success', text: 'Tratamiento guardado' });
            refreshData();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleImportPatients = async () => {
        if (!importFile || !selectedTenantId) {
            setMessage({ type: 'error', text: 'Selecciona un archivo y un cliente' });
            return;
        }
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('tenantId', selectedTenantId);
            formData.append('adminEmail', user!.email);

            const response = await fetch('/api/super-admin/import-patients', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            setImportResult(result);
            setMessage({
                type: 'success',
                text: `Importación completada: ${result.imported} pacientes importados, ${result.skipped} omitidos`
            });
            setImportFile(null);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setImporting(false);
        }
    };

    const selectedTenant = useMemo(() => data.tenants.find(t => t.id === selectedTenantId), [data.tenants, selectedTenantId]);
    const tenantClinics = useMemo(() => data.clinics.filter(c => c.tenant_id === selectedTenantId), [data.clinics, selectedTenantId]);
    const tenantDoctors = useMemo(() => data.doctors.filter(d => d.cliente_id === selectedTenantId), [data.doctors, selectedTenantId]);
    const tenantTreatments = useMemo(() => data.treatments.filter(t => t.cliente_id === selectedTenantId), [data.treatments, selectedTenantId]);

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#f8fafc] p-8">
            <header className="mb-8 border-b border-gray-200 pb-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Shield className="text-emerald-600" />
                            Super Admin Console
                        </h1>
                        <p className="text-gray-500 mt-1">Centro de mando multi-clínica y configuración de IA</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => refreshData()}
                            disabled={loading}
                            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-500 disabled:opacity-50"
                            title="Refrescar Datos"
                        >
                            <Activity size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <div className="flex flex-col">
                            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1">Cliente Activo</label>
                            <CustomSelect
                                options={data.tenants.map(t => ({ value: t.id, label: t.nombre }))}
                                value={selectedTenantId}
                                onChange={setSelectedTenantId}
                                className="min-w-[250px]"
                            />
                        </div>
                    </div>
                </div>

                <nav className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('onboarding')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'onboarding' ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        <UserPlus size={18} /> Onboarding
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Bot size={18} /> Configuración IA
                    </button>
                    <button
                        onClick={() => setActiveTab('operations')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'operations' ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                        <LayoutDashboard size={18} /> Operaciones
                    </button>
                </nav>
            </header>

            {message && (
                <div className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                    <div className="flex items-center gap-3">
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="font-medium">{message.text}</p>
                    </div>
                    <button onClick={() => setMessage(null)} className="text-current opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            {activeTab === 'onboarding' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Onboarding Forms (Reuse previous logic) */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Building className="text-emerald-600" /> Registrar Nuevo Cliente
                        </h2>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            createTenantAction(new FormData(e.currentTarget), user!.email)
                                .then(() => { setMessage({ type: 'success', text: 'Cliente creado' }); refreshData(); });
                        }} className="space-y-4">
                            <input name="name" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Nombre de Clínica" />
                            <input name="email" type="email" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Email Contacto" />
                            <input name="address" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Dirección Principal" />
                            <div className="grid grid-cols-2 gap-4">
                                <input name="cif" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="CIF" />
                                <input name="postal_code" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Código Postal" />
                            </div>
                            <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100">Crear Tenant y Sede</button>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <UserPlus className="text-emerald-600" /> Crear Admin para Cliente
                        </h2>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            createUserAction(new FormData(e.currentTarget), user!.email)
                                .then(() => { setMessage({ type: 'success', text: 'Admin creado' }); refreshData(); });
                        }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input name="name" required className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nombre" />
                                <input name="email" type="email" required className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Email" />
                            </div>
                            <input name="password" type="password" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contraseña" />
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400">Asignar a Tenant</label>
                                <CustomSelect
                                    options={data.tenants.map(t => ({ value: t.id, label: t.nombre }))}
                                    value={watchTenantId}
                                    onChange={(val) => setWatchTenantId(val)}
                                    placeholder="Seleccionar Cliente..."
                                />
                                <input type="hidden" name="tenantId" value={watchTenantId} />
                            </div>
                            <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">Vincular Usuario Admin</button>
                        </form>
                    </div>

                    {/* Import Patients */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <FileSpreadsheet className="text-emerald-600" /> Importar Pacientes (Excel/CSV)
                        </h2>
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-emerald-400 transition-colors">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="import-file"
                                />
                                <label htmlFor="import-file" className="cursor-pointer">
                                    <Upload size={40} className="mx-auto text-gray-400 mb-4" />
                                    {importFile ? (
                                        <p className="text-emerald-600 font-bold">{importFile.name}</p>
                                    ) : (
                                        <p className="text-gray-500">Arrastra o haz clic para seleccionar archivo</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-2">Formatos: Excel (.xlsx, .xls) o CSV</p>
                                </label>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-sm font-bold text-gray-700 mb-2">📋 Columnas reconocidas automáticamente:</p>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Paciente:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {['nombre', 'telefono', 'email', 'dni', 'genero', 'direccion', 'fecha_nacimiento'].map(col => (
                                                <span key={col} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] text-gray-600">{col}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase">Tratamientos (opcional):</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {['tratamiento', 'fecha_tratamiento', 'precio', 'estado_tratamiento'].map(col => (
                                                <span key={col} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-700">{col}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-blue-500 uppercase">Historial clínico (opcional):</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {['diagnostico', 'fecha_historial', 'observaciones_hist'].map(col => (
                                                <span key={col} className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700">{col}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleImportPatients}
                                disabled={!importFile || importing}
                                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {importing ? (
                                    <><Activity className="animate-spin" size={18} /> Importando...</>
                                ) : (
                                    <><Upload size={18} /> Importar Pacientes</>
                                )}
                            </button>

                            {importResult && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                    <p className="font-bold text-emerald-800">✅ Resultado:</p>
                                    <ul className="text-sm text-emerald-700 mt-2 space-y-1">
                                        <li>• Total filas: {importResult.total}</li>
                                        <li>• Importados: {importResult.imported}</li>
                                        <li>• Omitidos (duplicados): {importResult.skipped}</li>
                                    </ul>
                                    {importResult.errors?.length > 0 && (
                                        <div className="mt-2 text-xs text-red-600">
                                            {importResult.errors.map((e: string, i: number) => <p key={i}>{e}</p>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* WhatsApp Keys */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Globe className="text-emerald-500" /> WhatsApp API Keys
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Phone Number ID</label>
                                    <input
                                        value={aiConfig.whatsapp_keys?.phone_id || ''}
                                        onChange={(e) => setAiConfig({ ...aiConfig, whatsapp_keys: { ...aiConfig.whatsapp_keys, phone_id: e.target.value } })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Meta Phone ID"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Access Token</label>
                                    <input
                                        type="password"
                                        value={aiConfig.whatsapp_keys?.api_key || ''}
                                        onChange={(e) => setAiConfig({ ...aiConfig, whatsapp_keys: { ...aiConfig.whatsapp_keys, api_key: e.target.value } })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="sk_..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <MessageSquare className="text-emerald-500" /> Templates & Mappings
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase text-gray-400">Template Name</label>
                                    <input
                                        value={aiConfig.whatsapp_templates?.confirmation || ''}
                                        onChange={(e) => setAiConfig({ ...aiConfig, whatsapp_templates: { ...aiConfig.whatsapp_templates, confirmation: e.target.value } })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="confirmacion_cita"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase text-gray-400">Mapping Content (JSON)</label>
                                    <textarea
                                        value={mappingString}
                                        onChange={(e) => setMappingString(e.target.value)}
                                        className="w-full h-48 px-4 py-3 bg-gray-900 text-emerald-400 font-mono text-[11px] rounded-xl outline-none border border-gray-700 focus:border-emerald-500"
                                        placeholder='{ "header": ["{patient_name}"], "body": ["{date}", "{time}"] }'
                                    />
                                    <p className="text-[10px] text-gray-400 mt-2 px-1">
                                        Estructura sugerida: <br />
                                        <code className="bg-gray-100 px-1 rounded text-[9px]">{`{"header": ["{patient_name}"], "body": ["{date}", "{time}"]}`}</code>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* User Prompt / Personality */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Bot className="text-purple-600" /> IA User Prompt (Custom Personality)
                                </h2>
                                <button
                                    onClick={handleSaveAIConfig}
                                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-2 hover:bg-emerald-700 transition-all"
                                >
                                    <Save size={18} /> Guardar Configuración IA
                                </button>
                            </div>
                            <textarea
                                value={aiConfig.user_prompt || ''}
                                onChange={(e) => setAiConfig({ ...aiConfig, user_prompt: e.target.value })}
                                className="flex-1 w-full p-6 bg-gray-900 text-emerald-400 font-mono text-sm leading-relaxed rounded-2xl outline-none border border-gray-700 focus:border-emerald-500 shadow-inner"
                                placeholder="Define aquí las reglas, tono y comportamiento de la IA para este cliente..."
                            />
                            <div className="mt-4 flex gap-4 text-[10px] font-bold text-gray-400 uppercase">
                                <span>Variables disponibles: {"{patient_name}"}, {"{doctor_name}"}, {"{clinic_name}"}, {"{available_slots}"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'operations' && (
                <div className="space-y-8">
                    {/* Treatments & Financials */}
                    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2"><Briefcase className="text-emerald-600" /> Catálogo de Tratamientos</h3>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500">Nombre</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500">Descripción (IA Context)</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500">Precio</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {tenantTreatments.map(t => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold text-gray-900">{t.nombre}</td>
                                            <td className="px-6 py-4 text-gray-500 truncate max-w-[200px]">{t.description || '-'}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-emerald-600">{t.price}€</td>
                                            <td className="px-6 py-4">
                                                <button className="text-emerald-500 hover:text-emerald-700"><Edit3 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {tenantTreatments.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No hay tratamientos definidos para este cliente</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Plus className="text-emerald-600" /> Nuevo Tratamiento</h3>
                            <form onSubmit={handleUpsertTreatment} className="space-y-4">
                                <input name="nombre" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Nombre (ej: Limpieza Dental)" />
                                <textarea name="description" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none h-24" placeholder="Descripción para que la IA sepa de qué trata..." />
                                <div className="relative">
                                    <input name="price" type="number" step="0.01" required className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="0.00" />
                                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm">€</span>
                                </div>
                                <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all">Agregar al Catálogo</button>
                            </form>
                        </div>
                    </section>

                    {/* Clinics & Doctors */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <section className="space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Building className="text-emerald-600" /> Sedes de la Clínica</h3>
                                <div className="space-y-4">
                                    {tenantClinics.map(c => (
                                        <div key={c.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center text-sm">
                                            <div>
                                                <p className="font-bold text-gray-900">{c.name}</p>
                                                <p className="text-xs text-gray-500">{c.address}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Globe size={14} className="text-gray-400" />
                                                <input
                                                    defaultValue={c.google_review_link || ''}
                                                    onBlur={(e) => handleUpdateClinic(c.id, e.target.value)}
                                                    className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-lg outline-none w-[150px] focus:ring-1 focus:ring-emerald-500"
                                                    placeholder="Link Reseñas"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {tenantClinics.length === 0 && <p className="text-center text-gray-400 italic py-4">No hay sedes creadas</p>}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Plus className="text-emerald-600" /> Nueva Sede</h3>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    fd.append('tenantId', selectedTenantId || '');
                                    createClinicSuperAction(fd, user!.email)
                                        .then(() => { setMessage({ type: 'success', text: 'Sede creada' }); refreshData(); (e.target as HTMLFormElement).reset(); })
                                        .catch(err => setMessage({ type: 'error', text: err.message }));
                                }} className="space-y-4">
                                    <input name="name" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nombre (ej: Sede Norte)" />
                                    <input name="address" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Dirección" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input name="cif" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="CIF" />
                                        <input name="postal_code" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Código Postal" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input name="city" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Ciudad" />
                                        <input name="province" className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Provincia" />
                                    </div>
                                    <input name="phone" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Teléfono" />
                                    <input name="google_review_link" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Link de Reseñas (opcional)" />
                                    <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">Registrar Sede</button>
                                </form>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Stethoscope className="text-emerald-600" /> Doctores Asignados</h3>
                                <div className="space-y-4">
                                    {tenantDoctors.map(d => (
                                        <div key={d.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                                                {d.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{d.name}</p>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">{d.specialty || 'General'}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteDoctor(d.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Eliminar Doctor"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {tenantDoctors.length === 0 && (
                                        <p className="text-center text-gray-400 italic py-8">No hay doctores en esta clínica todavía</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Plus className="text-emerald-600" /> Nuevo Doctor</h3>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    fd.append('tenantId', selectedTenantId || '');
                                    createDoctorSuperAction(fd, user!.email)
                                        .then(() => { setMessage({ type: 'success', text: 'Doctor creado' }); refreshData(); (e.target as HTMLFormElement).reset(); })
                                        .catch(err => setMessage({ type: 'error', text: err.message }));
                                }} className="space-y-4">
                                    <input name="name" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nombre Completo" />
                                    <input name="specialty" required className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Especialidad (ej: Ortodoncia)" />
                                    <div className="space-y-1">
                                        <CustomSelect
                                            options={tenantClinics.map(c => ({ value: c.id, label: c.name }))}
                                            value={watchClinicId}
                                            onChange={(val) => setWatchClinicId(val)}
                                            placeholder="Vincular a Sede (opcional)..."
                                        />
                                        <input type="hidden" name="clinicId" value={watchClinicId} />
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">Dar de Alta Doctor</button>
                                </form>
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
}
