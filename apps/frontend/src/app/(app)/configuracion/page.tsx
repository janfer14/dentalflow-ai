'use client';

import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicProfilePanel } from '@/components/settings/clinic-profile-panel';
import { TeamMembersPanel } from '@/components/settings/team-members-panel';
import { TreatmentsPanel } from '@/components/settings/treatments-panel';
import { MyAccountPanel } from '@/components/settings/my-account-panel';
import { IntegrationsPanel } from '@/components/settings/integrations-panel';

const ADMIN_ROLE = 'Administrador';

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.roles.includes(ADMIN_ROLE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Administra tu clínica, tu equipo, tu cuenta y las integraciones conectadas.
        </p>
      </div>

      <Tabs defaultValue={isAdmin ? 'clinica' : 'cuenta'}>
        <TabsList>
          {isAdmin && <TabsTrigger value="clinica">Perfil de la clínica</TabsTrigger>}
          {isAdmin && <TabsTrigger value="usuarios">Usuarios y roles</TabsTrigger>}
          {isAdmin && <TabsTrigger value="tratamientos">Tratamientos</TabsTrigger>}
          <TabsTrigger value="cuenta">Mi cuenta</TabsTrigger>
          <TabsTrigger value="integraciones">Integraciones</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="clinica" className="mt-4">
            <ClinicProfilePanel />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="usuarios" className="mt-4">
            <TeamMembersPanel />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="tratamientos" className="mt-4">
            <TreatmentsPanel />
          </TabsContent>
        )}

        <TabsContent value="cuenta" className="mt-4">
          <MyAccountPanel />
        </TabsContent>

        <TabsContent value="integraciones" className="mt-4">
          <IntegrationsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
