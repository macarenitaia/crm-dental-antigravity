"use client";

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Calendar, Clock, User, Home, Stethoscope, ChevronRight } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';

const appointmentSchema = z.object({
    clientId: z.string().min(1, "Selecciona un paciente"),
    clinicId: z.string().min(1, "Selecciona una sede"),
    doctorId: z.string().min(1, "Selecciona un doctor"),
    start: z.string().min(1, "La fecha de inicio es requerida"),
    end: z.string().min(1, "La fecha de fin es requerida"),
    status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed', 'rescheduled']),
    notes: z.string().optional()
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
    initialData?: Partial<AppointmentFormValues>;
    clients: { id: string, name: string }[];
    clinics: { id: string, name: string }[];
    doctors: { id: string, name: string, color: string }[];
    doctorClinics: { doctor_id: string, clinic_id: string }[];
    onClose: () => void;
    onSave: (data: AppointmentFormValues) => void;
    onDelete?: () => void;
    isEditing?: boolean;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
    initialData,
    clients,
    clinics,
    doctors,
    doctorClinics,
    onClose,
    onSave,
    onDelete,
    isEditing
}) => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
        setValue,
        control
    } = useForm<AppointmentFormValues>({
        resolver: zodResolver(appointmentSchema),
        defaultValues: {
            clientId: initialData?.clientId || "",
            clinicId: initialData?.clinicId || "",
            doctorId: initialData?.doctorId || "",
            start: initialData?.start || "",
            end: initialData?.end || "",
            status: initialData?.status ?? 'scheduled',
            notes: initialData?.notes || ""
        }
    });

    const onSubmit = (data: AppointmentFormValues) => {
        onSave(data);
    };

    const selectedStatus = watch('status');
    const selectedClinicId = watch('clinicId');

    const filteredDoctors = React.useMemo(() => {
        if (!selectedClinicId) return doctors;
        const clinicDoctorIds = doctorClinics
            .filter(dc => dc.clinic_id === selectedClinicId)
            .map(dc => dc.doctor_id);

        return doctors.filter(d => clinicDoctorIds.includes(d.id));
    }, [doctors, doctorClinics, selectedClinicId]);

    return (
        <div className="bg-white rounded-3xl shadow-2xl w-[550px] max-w-full overflow-hidden border border-emerald-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-500 px-6 py-6 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
                <div className="relative">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {isEditing ? <Stethoscope className="text-emerald-100" /> : <Calendar className="text-emerald-100" />}
                        {isEditing ? 'Editar Cita' : 'Nueva Cita'}
                    </h2>
                    <p className="text-emerald-50 text-sm opacity-90">Completa los detalles de la programación</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                {/* Patient Selection */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                        <User size={14} /> Paciente
                    </label>
                    <Controller
                        name="clientId"
                        control={control}
                        render={({ field }) => (
                            <CustomSelect
                                options={clients.map(c => ({ value: c.id, label: c.name }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Seleccionar paciente..."
                                className={errors.clientId ? 'border-red-300' : ''}
                            />
                        )}
                    />
                    {errors.clientId && <p className="text-red-500 text-[10px] font-bold mt-1 ml-4 uppercase">{errors.clientId.message}</p>}
                </div>

                {/* Sede & Doctor Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                            <Home size={14} /> Sede
                        </label>
                        <Controller
                            name="clinicId"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    options={clinics.map(c => ({ value: c.id, label: c.name }))}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Seleccionar sede..."
                                    className={errors.clinicId ? 'border-red-300' : ''}
                                />
                            )}
                        />
                        {errors.clinicId && <p className="text-red-500 text-[10px] font-bold mt-1 ml-4 uppercase">{errors.clinicId.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                            <Stethoscope size={14} /> Especialista
                        </label>
                        <Controller
                            name="doctorId"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    options={filteredDoctors.map(d => ({ value: d.id, label: d.name }))}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Seleccionar doctor..."
                                    className={errors.doctorId ? 'border-red-300' : ''}
                                />
                            )}
                        />
                        {errors.doctorId && <p className="text-red-500 text-[10px] font-bold mt-1 ml-4 uppercase">{errors.doctorId.message}</p>}
                    </div>
                </div>

                {/* Time Grid */}
                <div className="grid grid-cols-2 gap-4 bg-emerald-50/30 p-4 rounded-3xl border border-emerald-50">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={14} /> Inicio
                        </label>
                        <input
                            type="datetime-local"
                            {...register('start')}
                            className={`w-full bg-white border-2 ${errors.start ? 'border-red-300' : 'border-emerald-100'} rounded-xl px-4 py-2 outline-none focus:border-emerald-500 accent-emerald-600 transition-all text-gray-700 font-medium`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={14} /> Fin
                        </label>
                        <input
                            type="datetime-local"
                            {...register('end')}
                            className={`w-full bg-white border-2 ${errors.end ? 'border-red-300' : 'border-emerald-100'} rounded-xl px-4 py-2 outline-none focus:border-emerald-500 accent-emerald-600 transition-all text-gray-700 font-medium`}
                        />
                    </div>
                </div>

                {/* Status - Hidden as per request */}
                <input type="hidden" {...register('status')} />

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-emerald-50">
                    {isEditing && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
                        >
                            <X size={14} /> Eliminar Cita
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl shadow-xl shadow-emerald-100 flex items-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar Cita' : 'Confirmar Cita'}
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};
