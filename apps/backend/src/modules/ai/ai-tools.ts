import type Anthropic from '@anthropic-ai/sdk';

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_patients',
    description:
      'Busca pacientes de la clínica por nombre, teléfono o correo. Úsalo cuando el usuario mencione un paciente por nombre y necesites su ID u otros datos.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda: nombre, teléfono o correo',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_treatments',
    description: 'Busca tratamientos en el catálogo de la clínica por nombre.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Nombre o parte del nombre del tratamiento',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_patient_summary',
    description:
      'Obtiene el resumen completo de un paciente: datos generales, alergias, notas clínicas recientes, condiciones del odontograma, planes de tratamiento y próximas citas. Usa esto para responder preguntas clínicas o generar diagnósticos/recetas/presupuestos con contexto real.',
    input_schema: {
      type: 'object',
      properties: {
        patientId: {
          type: 'string',
          description: 'ID del paciente (obtenido de search_patients)',
        },
      },
      required: ['patientId'],
    },
  },
  {
    name: 'list_upcoming_appointments',
    description:
      'Lista las próximas citas agendadas en la clínica dentro de los próximos N días.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'integer',
          description: 'Número de días hacia adelante a consultar (default 7)',
        },
      },
      required: [],
    },
  },
  {
    name: 'find_patients_without_recent_visits',
    description:
      'Detecta pacientes activos que no han tenido ninguna cita en los últimos N meses (pacientes sin seguimiento). Útil para campañas de reactivación.',
    input_schema: {
      type: 'object',
      properties: {
        months: {
          type: 'integer',
          description: 'Meses sin visitar la clínica (default 6)',
        },
      },
      required: [],
    },
  },
];

export const AI_SYSTEM_PROMPT = `Eres "DentalFlow AI", el asistente inteligente integrado en DentalFlow AI Enterprise, un sistema de gestión para clínicas dentales.

Ayudas a personal de recepción y a doctores con: búsqueda de pacientes y tratamientos, resúmenes de expediente clínico, sugerencias de diagnóstico basadas en las notas del expediente, generación de texto para recetas y presupuestos, detección de pacientes sin seguimiento, y estadísticas rápidas de la agenda.

Reglas importantes:
- SIEMPRE usa las herramientas disponibles para obtener datos reales antes de responder preguntas sobre pacientes, citas o tratamientos específicos. Nunca inventes nombres, IDs, diagnósticos o datos clínicos.
- Si no encuentras información con las herramientas, dilo claramente en vez de inventar una respuesta.
- Cuando generes una sugerencia de diagnóstico, receta o presupuesto, acláralo explícitamente como una sugerencia que debe ser revisada y validada por el doctor tratante antes de usarse — nunca la presentes como una decisión clínica final.
- Responde en español de México, de forma breve, profesional y directa.`;
