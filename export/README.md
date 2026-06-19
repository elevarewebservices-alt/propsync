# WhatsApp Sales Assistant — para agentes de bienes raíces

Asistente de IA que vive en el **WhatsApp Business** del agente y atiende a sus leads
automáticamente: responde dudas, califica al prospecto (presupuesto, zona, tipo),
busca propiedades que encajan, agenda visitas y avisa al agente cuando hay un lead caliente.

**Se vende individual** (standalone), separado de PropSync. Opcionalmente se conecta a
PropSync para usar el inventario real del agente.

> Este es el scaffold inicial. Cópialo a su propio repo de Git y deploya aparte.

---

## Por qué es vendible

- El agente promedio **pierde leads** porque no contesta a tiempo (noche, fines de semana, ocupado).
- El bot contesta en **segundos, 24/7**, califica, y solo le pasa al agente los leads serios.
- WhatsApp es el canal #1 en LatAm — esto vive donde el cliente ya está.

## Modelo de negocio sugerido

| Plan | Precio sugerido | Incluye |
|---|---|---|
| Básico | $29-39/mes | 1 número, respuestas IA, captura de leads |
| Pro | $59-79/mes | + calificación, agenda de visitas, conexión a inventario |
| Agencia | $99+/mes | varios agentes/números, reportes |

Costo real de IA por conversación: centavos (Haiku). El margen es alto.

---

## Arquitectura

```
Lead (WhatsApp) → Meta Cloud API → /api/whatsapp/webhook → Claude (loop con tools) → responde por Cloud API
                                          │
                                          └─ guarda conversación + lead en Supabase
```

### Stack
- **Next.js** (App Router) — mismo stack que PropSync, fácil de mantener
- **Meta WhatsApp Cloud API** — oficial, gratis hasta cierto volumen
- **Claude** (Anthropic) — el cerebro del asistente
- **Supabase** (PostgreSQL) — leads, conversaciones, propiedades

### Archivos
| Archivo | Qué hace |
|---|---|
| `app/api/whatsapp/webhook/route.ts` | GET (verificación de Meta) + POST (mensajes entrantes) |
| `lib/whatsapp.ts` | Cliente Cloud API: enviar texto, parsear webhook, verificar firma |
| `lib/assistant.ts` | Loop agéntico de Claude (prompt + tools + caching) |
| `lib/tools.ts` | Herramientas del bot: buscar propiedades, capturar/calificar lead, agendar, escalar a humano |
| `lib/supabase.ts` | Cliente admin de Supabase |
| `supabase/schema.sql` | Tablas: agents, properties, leads, conversations, messages |

---

## Setup (resumen)

1. **Crea la app en Meta** → developers.facebook.com → producto "WhatsApp" → obtén:
   - `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`
2. **Configura el webhook** en Meta apuntando a `https://tudominio.com/api/whatsapp/webhook`
   con el `WHATSAPP_WEBHOOK_VERIFY_TOKEN` que tú elijas. Suscríbete al evento `messages`.
3. **Supabase** → crea proyecto → corre `supabase/schema.sql`.
4. **Anthropic** → consigue `ANTHROPIC_API_KEY`.
5. Copia `.env.example` → `.env.local` y llena las variables.
6. `npm install && npm run dev`.

---

## Conexión opcional a PropSync

Si el agente tiene PropSync, el bot puede buscar en su inventario real en vez de la tabla local:
- En `lib/tools.ts`, la herramienta `search_properties` puede llamar a la API de PropSync
  (`GET /api/properties?search=...`) usando una API key del agente, en lugar de la tabla local.
- Así un solo bot sirve a clientes con y sin PropSync.

---

## Roadmap del MVP

- [ ] Webhook recibe y responde mensajes de texto (núcleo)
- [ ] Calificación de lead (presupuesto/zona/tipo) guardada en `leads`
- [ ] Búsqueda de propiedades + envío de ficha/enlace
- [ ] Agendar visita (captura fecha/hora, notifica al agente)
- [ ] Escalar a humano ("quiero hablar con un agente")
- [ ] Plantillas de WhatsApp para iniciar conversación (re-engagement)
- [ ] Panel web simple para que el agente vea sus leads
- [ ] Billing (Stripe) + onboarding self-service
