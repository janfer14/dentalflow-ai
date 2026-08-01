'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { usePatient } from '@/hooks/use-patients';
import { useAppointments } from '@/hooks/use-appointments';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientWhatsAppPanel } from '@/components/patients/patient-whatsapp-panel';
import { PatientDocumentsPanel } from '@/components/patients/patient-documents-panel';
import { ClinicalRecordPanel } from '@/components/clinical/clinical-record-panel';
import { PatientInvoicesPanel } from '@/components/billing/patient-invoices-panel';

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: patient, isLoading } = usePatient(id);
  const { data: appointments } = useAppointments({ patientId: id });
  const [defaultTab, setDefaultTab] = useState('resumen');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    // One-time read of the entry query param, only reachable client-side —
    // not a derived-state sync the lint rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab) setDefaultTab(tab);
  }, []);

  if (isLoading || !patient) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  // Age display only — doesn't need to react to elapsed time between
  // renders, so reading the wall clock here isn't the kind of divergence the
  // purity rule is meant to catch.
  const age = patient.birthDate
    ? Math.floor(
        // eslint-disable-next-line react-hooks/purity
        (Date.now() - new Date(patient.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
      )
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a pacientes
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel elevated rounded-2xl p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {patient.firstName[0]}
                {patient.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {age !== null ? `${age} años · ` : ''}
                {patient.gender === 'FEMALE' ? 'Femenino' : patient.gender === 'MALE' ? 'Masculino' : 'No especificado'}
              </p>
            </div>
          </div>
          <Badge variant={patient.isActive ? 'default' : 'secondary'}>
            {patient.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border/60 pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {patient.phone ?? 'Sin registrar'}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {patient.email ?? 'Sin registrar'}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {patient.address ?? 'Sin registrar'}
          </div>
        </div>

        {patient.allergies && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Alergias</p>
              <p>{patient.allergies}</p>
            </div>
          </div>
        )}
      </motion.div>

      <Tabs value={defaultTab} onValueChange={setDefaultTab}>
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="expediente">Expediente clínico</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel elevated rounded-2xl p-6 lg:col-span-2"
            >
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4" />
                Historial de citas
              </h2>

              {appointments && appointments.length > 0 ? (
                <ul className="space-y-2">
                  {appointments.map((appointment) => (
                    <li
                      key={appointment.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{appointment.treatment?.name ?? 'Consulta general'}</p>
                        <p className="text-xs text-muted-foreground">
                          Dr(a). {appointment.doctor.firstName} {appointment.doctor.lastName}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(appointment.startsAt).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Este paciente aún no tiene citas registradas.
                </p>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <PatientWhatsAppPanel patientId={patient.id} />
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="expediente" className="mt-4">
          <ClinicalRecordPanel patientId={patient.id} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <PatientDocumentsPanel patientId={patient.id} />
        </TabsContent>

        <TabsContent value="facturacion" className="mt-4">
          <PatientInvoicesPanel patientId={patient.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
