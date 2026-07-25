import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Clínica Dental Demo',
      legalName: 'Clínica Dental Demo S.A. de C.V.',
      planTier: 'enterprise',
    },
  });

  const clinic = await prisma.clinic.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organizationId: organization.id,
      name: 'Sucursal Central',
      address: 'Av. Reforma 123, CDMX',
      city: 'Ciudad de México',
      state: 'CDMX',
    },
  });

  await prisma.consultingRoom.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      clinicId: clinic.id,
      name: 'Consultorio 1',
    },
  });

  await prisma.cashRegister.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      clinicId: clinic.id,
      name: 'Caja Recepción',
    },
  });

  // Second clinic so the multi-branch clinic selector has something real to
  // switch between out of the box.
  const clinicNorte = await prisma.clinic.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      organizationId: organization.id,
      name: 'Sucursal Norte',
      address: 'Av. Insurgentes Norte 456, CDMX',
      city: 'Ciudad de México',
      state: 'CDMX',
    },
  });

  await prisma.consultingRoom.upsert({
    where: { id: '00000000-0000-0000-0000-000000000006' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000006',
      clinicId: clinicNorte.id,
      name: 'Consultorio 1',
    },
  });

  await prisma.cashRegister.upsert({
    where: { id: '00000000-0000-0000-0000-000000000007' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000007',
      clinicId: clinicNorte.id,
      name: 'Caja Recepción',
    },
  });

  const permissionKeys = [
    'patients.read',
    'patients.write',
    'appointments.read',
    'appointments.write',
    'billing.read',
    'billing.write',
    'billing.refund',
    'inventory.read',
    'inventory.write',
    'settings.write',
    'reports.read',
  ];

  const permissions = await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({ where: { key }, update: {}, create: { key } }),
    ),
  );

  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Administrador' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Administrador',
      description: 'Acceso total al sistema',
      isSystem: true,
    },
  });

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      }),
    ),
  );

  const doctorRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Doctor' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Doctor',
      description: 'Doctores y especialistas',
      isSystem: true,
    },
  });

  const receptionRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Recepcion' } },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Recepcion',
      description: 'Personal de recepción y agenda',
      isSystem: true,
    },
  });

  const passwordHash = await argon2.hash('DentalFlow123!');

  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'admin@dentalflow.ai' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'admin@dentalflow.ai',
      passwordHash,
      firstName: 'Ana',
      lastName: 'Administradora',
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  await prisma.userClinic.upsert({
    where: { userId_clinicId: { userId: admin.id, clinicId: clinic.id } },
    update: {},
    create: { userId: admin.id, clinicId: clinic.id },
  });

  await prisma.userClinic.upsert({
    where: { userId_clinicId: { userId: admin.id, clinicId: clinicNorte.id } },
    update: {},
    create: { userId: admin.id, clinicId: clinicNorte.id },
  });

  const doctor = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'doctor@dentalflow.ai' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'doctor@dentalflow.ai',
      passwordHash,
      firstName: 'Carlos',
      lastName: 'Hernández',
      isDoctor: true,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: doctor.id, roleId: doctorRole.id } },
    update: {},
    create: { userId: doctor.id, roleId: doctorRole.id },
  });

  await prisma.userClinic.upsert({
    where: { userId_clinicId: { userId: doctor.id, clinicId: clinic.id } },
    update: {},
    create: { userId: doctor.id, clinicId: clinic.id },
  });

  const reception = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'recepcion@dentalflow.ai' } },
    update: {},
    create: {
      organizationId: organization.id,
      email: 'recepcion@dentalflow.ai',
      passwordHash,
      firstName: 'Lucía',
      lastName: 'Ramírez',
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: reception.id, roleId: receptionRole.id } },
    update: {},
    create: { userId: reception.id, roleId: receptionRole.id },
  });

  const generalSpecialty = await prisma.specialty.upsert({
    where: { name: 'Odontología General' },
    update: {},
    create: { name: 'Odontología General' },
  });

  await prisma.specialty.upsert({
    where: { name: 'Ortodoncia' },
    update: {},
    create: { name: 'Ortodoncia' },
  });

  await prisma.treatment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      organizationId: organization.id,
      specialtyId: generalSpecialty.id,
      name: 'Limpieza dental',
      defaultCost: 200,
      defaultPrice: 600,
      durationMinutes: 45,
    },
  });

  await prisma.treatment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      organizationId: organization.id,
      specialtyId: generalSpecialty.id,
      name: 'Resina dental',
      defaultCost: 350,
      defaultPrice: 950,
      durationMinutes: 60,
    },
  });

  const patient = await prisma.patient.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      organizationId: organization.id,
      firstName: 'Mariana',
      lastName: 'López',
      phone: '+52 55 1234 5678',
      email: 'mariana.lopez@example.com',
      gender: 'FEMALE',
    },
  });

  const whatsappTemplates: { key: string; body: string }[] = [
    {
      key: 'appointment_confirmation',
      body: 'Hola {{1}}, tu cita en {{5}} quedó agendada para el {{2}} a las {{3}} con {{4}}. ¡Te esperamos!',
    },
    {
      key: 'appointment_reminder_72h',
      body: 'Hola {{1}}, te recordamos tu cita en {{5}} el {{2}} a las {{3}} con {{4}} (en 3 días).',
    },
    {
      key: 'appointment_reminder_48h',
      body: 'Hola {{1}}, tu cita en {{5}} es el {{2}} a las {{3}} con {{4}} (en 2 días).',
    },
    {
      key: 'appointment_reminder_24h',
      body: 'Hola {{1}}, mañana {{2}} a las {{3}} tienes tu cita en {{5}} con {{4}}. ¡Nos vemos pronto!',
    },
    {
      key: 'appointment_reminder_2h',
      body: 'Hola {{1}}, tu cita en {{5}} es hoy a las {{3}} con {{4}}. ¡Te esperamos en un par de horas!',
    },
    {
      key: 'appointment_cancelled',
      body: 'Hola {{1}}, tu cita del {{2}} a las {{3}} en {{5}} ha sido cancelada. Contáctanos para reagendar.',
    },
    {
      key: 'appointment_rescheduled',
      body: 'Hola {{1}}, tu cita en {{5}} fue reagendada para el {{2}} a las {{3}} con {{4}}.',
    },
  ];

  for (const template of whatsappTemplates) {
    await prisma.whatsAppTemplate.upsert({
      where: { organizationId_key: { organizationId: organization.id, key: template.key } },
      update: {},
      create: { organizationId: organization.id, key: template.key, body: template.body },
    });
  }

  console.log('Seed completado:');
  console.log(`  Organización: ${organization.name}`);
  console.log(`  Clínicas: ${clinic.name}, ${clinicNorte.name}`);
  console.log(`  Admin: admin@dentalflow.ai / DentalFlow123!`);
  console.log(`  Doctor: doctor@dentalflow.ai / DentalFlow123!`);
  console.log(`  Recepción: recepcion@dentalflow.ai / DentalFlow123!`);
  console.log(`  Paciente demo: ${patient.firstName} ${patient.lastName}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
