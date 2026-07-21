# DentalFlow AI Enterprise

Sistema inteligente de gestión para consultorios y clínicas dentales — SaaS multi-tenant construido para competir con Dentalink, Dentrix, OpenDental y Cliniko.

No es una demo desechable: todo lo incluido aquí compila, corre, tiene autenticación real, base de datos real con migraciones, pruebas automatizadas y CI, y fue verificado en navegador (Playwright) módulo por módulo, con datos reales de principio a fin (agendar → confirmar por WhatsApp → atender → cobrar → reportar).

## Stack

**Frontend** — `apps/frontend`
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Framer Motion · TanStack Query · React Hook Form · Zod · Axios · recharts

**Backend** — `apps/backend`
NestJS 11 · Prisma ORM 7 (driver adapters, `@prisma/adapter-pg`) · PostgreSQL 16 · Redis + BullMQ (colas de recordatorios) · Passport JWT · Argon2 · otplib (2FA TOTP) · WhatsApp Cloud API · Google OAuth2 · Anthropic Claude API (Asistente IA) · Swagger

**Infraestructura**
Docker Compose (Postgres + Redis) · npm workspaces (monorepo) · GitHub Actions (CI)

## Estructura

```
dentalflow-ai/
├── .github/workflows/       # CI (lint, typecheck, tests, build)
├── apps/
│   ├── frontend/             # Next.js — dashboard, agenda, pacientes, expedientes,
│   │                          #   caja, inventario, whatsapp, asistente, reportes,
│   │                          #   portal del paciente, login (+ Google OAuth)
│   └── backend/              # NestJS — API REST, Prisma, colas, integraciones
├── packages/                 # shared / ui / types / utils (reservado para Fase 2+)
├── docker-compose.yml        # Postgres (puerto 5433) + Redis (puerto 6379)
└── package.json              # workspaces raíz
```

> **Nota:** Postgres corre en el puerto **5433** (no 5432) porque este equipo ya tenía una instancia nativa de PostgreSQL ocupando ese puerto. Ajusta `DATABASE_URL` si tu entorno es distinto.

## Arranque rápido

```bash
# 1. Levantar Postgres y Redis
npm run docker:up

# 2. Instalar dependencias (raíz, workspaces)
npm install

# 3. Migrar y poblar la base de datos
npm run prisma:migrate -w apps/backend
cd apps/backend && npm run prisma:seed

# 4. Levantar backend y frontend (dos terminales)
npm run dev:backend    # http://localhost:3001/api/v1  (Swagger en /api/docs)
npm run dev:frontend   # http://localhost:3000
```

### Usuarios de prueba (seed)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@dentalflow.ai | DentalFlow123! |
| Doctor | doctor@dentalflow.ai | DentalFlow123! |
| Recepción | recepcion@dentalflow.ai | DentalFlow123! |

El seed también crea una paciente de prueba (**Mariana López**, `+52 55 1234 5678`) para probar el Portal del Paciente en `http://localhost:3000/portal/login`.

## Qué está implementado

**Arquitectura de base de datos** — Esquema Prisma multi-tenant (organizaciones/clínicas/consultorios), usuarios/roles/permisos, pacientes, expediente clínico (odontograma, notas, planes de tratamiento, recetas), agenda, facturación, inventario, mensajería WhatsApp, conversaciones de IA — diseñado para escalar hacia los 100+ modelos de la especificación completa sin romper compatibilidad.

**Autenticación y seguridad** — JWT con refresh tokens rotativos (hash SHA-256 en base de datos), 2FA por TOTP (otplib + QR), inicio de sesión con **Google OAuth** (degrada a 503 sin romper el arranque si no está configurado), bloqueo de cuenta tras intentos fallidos, RBAC (roles/permisos), Helmet, rate limiting (Throttler), CORS, validación estricta de DTOs (class-validator), Argon2 para contraseñas.

**Agenda** — CRUD de citas con **prevención real de doble reservación** (por doctor y por consultorio, verificado a nivel de base de datos), vista diaria navegable, formulario con búsqueda de pacientes.

**Pacientes** — CRUD completo (backend + UI), búsqueda, ficha con pestañas (resumen, expediente, facturación).

**Expediente clínico** — Odontograma interactivo por pieza dental, notas clínicas, planes de tratamiento con items, recetas.

**Caja y cobranza** — Facturación (subtotal/impuesto/total/saldo), pagos parciales y múltiples métodos, corte de caja.

**Inventario** — Catálogo de insumos, movimientos de entrada/salida, alertas de stock bajo.

**Reportes ejecutivos** — Ingresos por rango de fecha (gráfica de área), ingresos por doctor, tratamientos más solicitados, exportación a CSV.

**Asistente DentalFlow AI** — Chat con Claude (`@anthropic-ai/sdk`, modelo `claude-opus-4-8`) con herramientas propias ancladas a datos reales (buscar pacientes, buscar tratamientos, resumen clínico de un paciente). Funciona en **modo sandbox** sin `ANTHROPIC_API_KEY` (explica cómo activarlo) y responde de verdad en cuanto se configura la clave.

**WhatsApp Cloud API** — Confirmación automática al agendar, recordatorios programados a 72h/48h/24h/2h antes de la cita (colas BullMQ con delay preciso, no polling), aviso de cancelación y de reagendamiento, webhook de verificación y recepción (firma HMAC opcional vía `WHATSAPP_APP_SECRET`), actualización de estado de mensajes (enviado/entregado/leído/fallido) desde los callbacks de Meta, chat interno por paciente, plantillas editables desde la UI. Funciona en **modo sandbox** sin credenciales (simula el envío y deja todo registrado en base de datos) y pasa a modo real en cuanto se configuran `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_ACCESS_TOKEN`.

**Portal del Paciente** (`/portal/login`) — Inicio de sesión sin contraseña vía código OTP de 6 dígitos enviado por WhatsApp al número registrado del paciente, con su propio espacio de JWT (`JWT_PATIENT_ACCESS_SECRET`, separado del de personal). Desde el portal el paciente ve sus próximas citas, puede cancelarlas, y consulta sus facturas y saldos.

**Diseño** — Glassmorphism, modo claro/oscuro/automático, sidebar con indicador animado (Framer Motion), búsqueda global tipo Spotlight (⌘K / Ctrl+K), dashboard con KPIs animados, todo verificado visualmente en navegador (Chromium headless) en ambos temas.

**CI** (`.github/workflows/ci.yml`) — En cada push/PR a `main`: backend (lint, typecheck, tests unitarios, tests e2e contra Postgres/Redis reales via GitHub Actions services, build) y frontend (lint, typecheck, build) corren en paralelo.

### Configurar WhatsApp Cloud API en producción

1. Crea una app en [developers.facebook.com](https://developers.facebook.com) con el producto WhatsApp.
2. Copia el **Phone Number ID** y genera un **Access Token** permanente (System User) en el panel de WhatsApp > API Setup.
3. Rellena en `apps/backend/.env`: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, y opcionalmente `WHATSAPP_APP_SECRET` (para validar la firma del webhook).
4. En la configuración del webhook de Meta, apunta a `https://tu-dominio/api/v1/whatsapp/webhook` con el `WHATSAPP_VERIFY_TOKEN` que definiste en `.env`.
5. Crea y aprueba en Meta Business Manager las plantillas con los mismos nombres (`key`) que están en `WhatsAppTemplate` (ej. `appointment_confirmation`), usando parámetros numerados `{{1}}`…`{{5}}` en el mismo orden: paciente, fecha, hora, doctor, clínica.

### Configurar el Asistente DentalFlow AI en producción

Rellena `ANTHROPIC_API_KEY` en `apps/backend/.env` con una clave de [console.anthropic.com](https://console.anthropic.com). `ANTHROPIC_MODEL` ya viene configurado con `claude-opus-4-8`.

### Configurar Google OAuth en producción

Crea credenciales OAuth 2.0 en [console.cloud.google.com](https://console.cloud.google.com) (APIs y servicios > Credenciales) y rellena `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` en `apps/backend/.env`. El redirect URI autorizado debe ser `GOOGLE_CALLBACK_URL` (por defecto `http://localhost:3001/api/v1/auth/google/callback`).

## Qué falta (roadmap)

Portal del doctor, multisucursal completo (selector de clínica), OAuth con Microsoft, almacenamiento S3 real para documentos/consentimientos, mensajes masivos/promociones/cumpleaños por WhatsApp, sincronización con Google/Outlook/Apple Calendar, exportación a PDF/Excel (hoy solo CSV en Reportes), odontograma 3D interactivo (hoy es 2D por pieza).

Cada uno de estos es un módulo real de trabajo — se recomienda construirlos de forma incremental, uno a la vez, verificando que compile, pase tests y corra en navegador antes de avanzar al siguiente.

## Pruebas

```bash
npm test -w apps/backend        # unitarios (Jest)
npm run test:e2e -w apps/backend  # e2e (Jest + Supertest, requiere Postgres/Redis corriendo)
npm run lint -w apps/backend
npm run lint -w apps/frontend
```

## Comandos útiles

```bash
npm run docker:up / docker:down         # Postgres + Redis
npm run prisma:studio -w apps/backend   # explorador visual de la base de datos
npm run build:backend / build:frontend
```
