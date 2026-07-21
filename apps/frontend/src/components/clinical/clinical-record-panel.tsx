'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useClinicalRecord } from '@/hooks/use-clinical-records';
import { OdontogramChart } from './odontogram-chart';
import { ClinicalNotesPanel } from './clinical-notes-panel';
import { TreatmentPlanPanel } from './treatment-plan-panel';
import { PrescriptionsPanel } from './prescriptions-panel';

export function ClinicalRecordPanel({ patientId }: { patientId: string }) {
  const { data, isLoading } = useClinicalRecord(patientId);

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="odontograma" className="w-full">
      <TabsList>
        <TabsTrigger value="odontograma">Odontograma</TabsTrigger>
        <TabsTrigger value="notas">Notas clínicas</TabsTrigger>
        <TabsTrigger value="plan">Plan de tratamiento</TabsTrigger>
        <TabsTrigger value="recetas">Recetas</TabsTrigger>
      </TabsList>

      <TabsContent value="odontograma" className="mt-4">
        <OdontogramChart patientId={patientId} teeth={data.odontogram?.teeth ?? []} />
      </TabsContent>

      <TabsContent value="notas" className="mt-4">
        <ClinicalNotesPanel patientId={patientId} notes={data.clinicalNotes} />
      </TabsContent>

      <TabsContent value="plan" className="mt-4">
        <TreatmentPlanPanel patientId={patientId} plans={data.treatmentPlans} />
      </TabsContent>

      <TabsContent value="recetas" className="mt-4">
        <PrescriptionsPanel patientId={patientId} prescriptions={data.prescriptions} />
      </TabsContent>
    </Tabs>
  );
}
