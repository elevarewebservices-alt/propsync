'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { isNativeApp } from '@/lib/native'

// ── Translations ─────────────────────────────────────────────────────────────
const T = {
  es: {
    badge: 'CRM inmobiliario con IA · Hecho en Panamá',
    h1: 'Tu agencia,',
    cycle: ['Centralizada.', 'Con CRM nativo.', 'Potenciada con IA.'],
    sub: 'PropSync es el CRM inmobiliario con IA para Panamá: tu inventario, tus clientes y la publicación en Encuentra24 y Compre o Alquile, en una sola plataforma.',
    cta: 'Comenzar gratis',
    demo: 'Probar la demo',
    nav: { platform: 'Plataforma', marketing: 'Funciones', ai: 'IA', portals: 'Portales', faq: 'Preguntas', pricing: 'Planes', contact: 'Contacto' },
    stats: [
      { val: 'Encuentra24', label: 'y Compre o Alquile', sub: 'publicación automática por feed' },
      { val: '15 días', label: 'Prueba gratis', sub: 'sin tarjeta de crédito' },
      { val: '360°', label: 'Tours virtuales', sub: 'incluidos en cada propiedad' },
    ],

    // Platform statement
    platformBadge: 'Plataforma integral',
    platformTitle: 'Marketing, ventas y comunicación — en un solo lugar.',
    platformSub: 'PropSync centraliza toda la operación de tu negocio inmobiliario. Desde el primer contacto con el lead hasta el cierre del negocio, sin salir de la plataforma.',
    platformPills: ['Base de datos', 'CRM nativo', 'Marketing automation', 'Captación de leads', 'Asistente IA', 'Tour virtual 360°', 'API REST', 'Ficha web pública', 'App móvil (próximamente)', 'Reportes', 'Multi-usuario', 'Meta Lead Ads'],

    // How it works - pillars
    howTitle: 'Tres pilares',
    howSub: 'Una plataforma construida sobre lo que realmente importa',
    steps: [
      { n: '01', t: 'Base de datos central', b: 'Importa desde Wasi, carga manualmente o conecta tus fuentes. PropSync crea una base de datos única y estructurada de todo tu inventario, sin duplicados y siempre actualizada.' },
      { n: '02', t: 'CRM nativo integrado', b: 'Pipeline completo con etapas, clientes asignados, seguimiento, notas inmutables e historial completo — todo dentro de PropSync, sin apps externas.' },
      { n: '03', t: 'Inteligencia artificial', b: 'El asistente IA redacta descripciones, responde preguntas sobre tu cartera, analiza tendencias y contacta propietarios automáticamente.' },
    ],

    // Marketing
    mktTitle: 'Automatización de marketing y captación de leads',
    mktSub: 'Tu sitio web captura leads directamente a tu CRM. PropSync los nutre automáticamente con WhatsApp, email y seguimiento hasta el cierre.',
    mktPoints: [
      'Meta Lead Ads y formularios web capturan leads directo al CRM',
      'Campañas de WhatsApp y email automatizadas',
      'Seguimiento automático de interesados por propiedad',
      'Alertas de nuevas propiedades a leads existentes',
      'Reportes de conversión lead → cierre',
    ],
    mktNoti: [
      { title: 'Nuevo lead capturado', l1: 'María García · maria@gmail.com', l2: 'Interesada: Apto Punta Pacífica', time: '2 min' },
      { title: 'WhatsApp enviado automáticamente', l1: 'José Rodríguez · propietario', l2: 'Verificación de disponibilidad', time: '5 min' },
      { title: 'Disponibilidad confirmada', l1: 'Casa Costa del Este · #B-1823', l2: 'Estado actualizado en base de datos', time: '8 min' },
    ],

    // AI Agent
    agentTitle: 'El agente que nunca duerme',
    agentSub: 'Un asistente de IA que contacta propietarios, actualiza disponibilidad, responde clientes y mantiene todo tu inventario activo — sin intervención humana.',
    agentPoints: [
      'Contacta propietarios por WhatsApp automáticamente',
      'Actualiza disponibilidad en tiempo real',
      'Responde consultas de clientes 24/7',
      'Redacta y optimiza descripciones de propiedades',
      'Agenda visitas y sincroniza el CRM',
      'Detecta y alerta sobre propiedades sin actividad',
    ],
    agentChat: {
      header: 'PropSync IA',
      online: 'en línea',
      msg1: 'Hola José! Soy el asistente de Inmobiliaria Las Palmas. Tu propiedad en Punta Pacífica (#A-2341) — ¿sigue disponible para visitas? 🏠',
      time1: '13:42',
      reply: 'Sí, disponible. Pueden visitar martes y jueves 👍',
      time2: '13:45',
      updates: ['Propiedad #A-2341 → Disponible', 'Base de datos actualizada', '3 interesados notificados', 'Visitas: mar. y jue. agendadas'],
      time3: '13:45',
    },

    // Web integration + API
    webApiTitle: 'Conecta tu sitio web y tu stack tecnológico',
    webApiSub: 'PropSync se integra con tu sitio web existente y expone una API REST completa para conectar cualquier herramienta.',
    webTitle: 'Tu inventario, visible en la web',
    webSub: 'Cada propiedad tiene página pública con fotos y PDF descargable, y su tour 360° se incrusta en cualquier sitio web con una línea de código.',
    apiTitle: 'API REST + Webhooks',
    apiSub: 'Acceso completo a tu inventario desde cualquier aplicación. Webhooks en tiempo real para integraciones avanzadas.',
    apiFeatures: ['Autenticación con API key', 'Exporta tu inventario completo con fotos', 'Paginación y límites de uso seguros', 'Ficha pública y PDF por propiedad', 'Tours 360° incrustables por iframe'],

    // Pricing
    plansTitle: 'Planes',
    plansSub: 'Elige el nivel que se adapta a tu agencia · Cotización a medida',
    trialBadge: '15 días de prueba gratis',
    trialSub: 'Sin tarjeta de crédito · Cancela cuando quieras',
    plans: [
      { n: 'Individual', d: 'Para agentes independientes', f: ['100 propiedades', 'Base de datos centralizada', 'CRM básico', 'Asistente IA limitado', 'Conexión a portales (Compre o Alquile, Encuentra24, Página web)', '1 usuario'], cta: 'Probar 15 días gratis' },
      { n: 'Pro', d: 'Para equipos en crecimiento', popular: true, f: ['Propiedades ilimitadas', 'CRM completo + pipeline', 'Asistente IA completo', 'Conexión a portales (Compre o Alquile, Encuentra24, Página web)', '2 usuarios (usuarios adicionales disponibles)', 'API de integración'], cta: 'Probar 15 días gratis' },
    ],

    ctaBand: 'Tu agencia, en una sola plataforma.',
    ctaBandSub: 'Sin tarjeta de crédito. Sin instalaciones.',
    ctaBandBtn: 'Crear cuenta gratis',
    footerTagline: 'Marketing · CRM · IA para inmobiliarias.',
    credit: 'Creado por',

    // 3D Tours
    tourBadge: 'Recorridos virtuales',
    tourTitle: 'Tour virtual 360° para cada propiedad.',
    tourSub: 'Tus clientes recorren cualquier propiedad desde cualquier parte del mundo. Sube fotos panorámicas 360° o fotos regulares — PropSync crea el tour y genera el enlace para compartir e incrustar en tu sitio web.',
    tourPoints: [
      'Fotos regulares con animación Ken Burns inmersiva',
      'Fotos panorámicas 360° con navegación libre',
      'Enlace público para compartir con clientes',
      'Código iframe para incrustar en cualquier sitio web',
      'Reduce visitas innecesarias y acelera el cierre',
      'Accesible desde desktop y móvil sin apps adicionales',
    ],
    tourLabel: 'Tour 360° · Piso 8 · 120 m²',
    tourDemo: 'Ver demo',

    // How it works step-by-step
    howWorksTitle: 'Cómo funciona',
    howWorksSub: 'De cero a completamente operativo en minutos',
    howWorksSteps: [
      { n: '01', t: 'Conecta tus fuentes', b: 'Importa desde Wasi con un clic, sube propiedades manualmente o conecta tus formularios web y Meta Lead Ads. PropSync unifica todo.' },
      { n: '02', t: 'Construye tu inventario', b: 'Cada propiedad tiene ficha completa: fotos, precio, área, tour 360°, notas y historial. Sin duplicados, siempre actualizado.' },
      { n: '03', t: 'Captura y gestiona leads', b: 'Los leads llegan desde tu web, Meta Ads o manualmente. El CRM Kanban los organiza: Nuevo → Contactado → Visita → Oferta → Cerrado.' },
      { n: '04', t: 'Automatiza el seguimiento', b: 'Notificaciones por email, recordatorios automáticos y alertas de seguimiento. Tu equipo siempre sabe qué hacer y cuándo.' },
      { n: '05', t: 'Publica y cierra', b: 'Marca en qué portales sale cada propiedad y Encuentra24 y Compre o Alquile la toman de tu feed automáticamente. Comparte tours 360° y mide qué fuente te trae más cierres.' },
    ],

    // Contact
    contactTitle: '¿Tienes preguntas?',
    contactSub: 'Nuestro equipo está listo para ayudarte a configurar PropSync para tu agencia. Escríbenos o llámanos.',
    contactPhone: '+507 6513-9139',
    contactEmail: 'gerencia@elevarewebservices.com',
    contactTypes: [
      { value: 'soporte', label: 'Soporte técnico' },
      { value: 'ventas',  label: 'Consulta de ventas' },
      { value: 'otro',    label: 'Otra consulta' },
    ],
    contactFields: {
      name: 'Tu nombre',
      email: 'Tu email',
      type: 'Tipo de consulta',
      message: 'Cuéntanos en qué podemos ayudarte...',
      send: 'Enviar mensaje',
      sending: 'Enviando...',
      sent: '¡Mensaje enviado! Te contactaremos pronto.',
      error: 'No se pudo enviar.',
    },

    // Add-on services
    addonsBadge: 'Servicios adicionales',
    addonsTitle: 'Potencia tu agencia con servicios gestionados',
    addonsSub: 'Estas integraciones requieren configuración personalizada. El equipo de Elevare las instala y gestiona por ti.',
    addons: [
      {
        icon: '',
        tag: 'Add-on',
        name: 'WhatsApp para propietarios',
        description: 'Automatiza el contacto con propietarios vía WhatsApp para verificar disponibilidad. El sistema envía mensajes masivos, procesa las respuestas y actualiza el estado de cada propiedad en PropSync automáticamente.',
        includes: ['Integración con WhatsApp Business API', 'Mensajes masivos a propietarios', 'Procesamiento automático de respuestas', 'Actualización automática de disponibilidad'],
        cta: 'Consultar',
      },
      {
        icon: '',
        tag: 'Add-on',
        name: 'Follow-ups automáticos',
        description: 'Secuencias de seguimiento multipaso que se ejecutan solas. Defines los pasos —día 0, día 3, día 7— y cada lead avanza por la secuencia hasta que responde. Si contesta, la secuencia se detiene sola y el contacto queda marcado en el CRM.',
        includes: ['Secuencias multipaso configurables por etapa', 'Envío por WhatsApp (Twilio) y por email', 'Corte automático cuando el lead responde', 'Registro de cada paso en el historial del contacto'],
        cta: 'Consultar',
      },
    ] as { icon: string; tag: string; name: string; description: string; includes: string[]; cta: string }[],
    addonsNote: 'Gestionado por Elevare · Alcance definido según configuración',

    // Portal publishing
    portalsBadge: 'Publicación en portales',
    portalsTitle: 'Publica en Encuentra24 y Compre o Alquile sin copiar y pegar.',
    portalsSub: 'PropSync genera un feed XML privado para cada portal. Marcas en qué portales sale cada propiedad y el portal la toma automáticamente en su siguiente lectura, normalmente una vez al día. Si la vendes, la alquilas o la desactivas, sale de los portales sola. Fotos, precio, ubicación, características y tour 360° viajan con cada anuncio.',
    portalsSteps: [
      { t: 'Marca los portales', b: 'En cada propiedad eliges Encuentra24, Compre o Alquile o ambos.' },
      { t: 'El portal lee tu feed', b: 'Cada portal consulta tu URL privada y publica o actualiza tus anuncios.' },
      { t: 'Todo se mantiene al día', b: 'Precio, fotos y disponibilidad se actualizan solos; lo vendido desaparece.' },
    ],
    portalsNote: 'La conexión se activa una vez por portal con tu cuenta de agencia. El equipo de Elevare te acompaña en el proceso.',
    portalsMock: { title: 'Lugares de publicación', live: 'En el feed', sold: 'Vendida · fuera del feed' },

    // FAQ
    faqBadge: 'Preguntas frecuentes',
    faqTitle: 'Lo que las inmobiliarias nos preguntan',
    faq: [
      { q: '¿Qué es PropSync?', a: 'PropSync es un CRM inmobiliario con inteligencia artificial hecho para agencias y agentes independientes en Panamá. Reúne en una sola plataforma la base de datos de propiedades, el CRM de clientes con embudo Kanban, tours virtuales 360°, un asistente con IA y la publicación en Encuentra24 y Compre o Alquile. Lo desarrolla Elevare, una empresa panameña.' },
      { q: '¿PropSync publica en Encuentra24 y Compre o Alquile?', a: 'Sí. Cada agencia obtiene un feed XML privado por portal. Marcas los portales en cada propiedad y el portal la publica y actualiza en su siguiente lectura, normalmente en menos de 24 horas. Las propiedades vendidas, alquiladas o desactivadas salen del feed automáticamente.' },
      { q: '¿Sirve para un agente independiente?', a: 'Sí. El plan Individual está pensado para un solo usuario: hasta 100 propiedades, CRM, asistente con IA y conexión a portales. Los equipos usan el plan Pro, con propiedades ilimitadas, varios usuarios y API de integración.' },
      { q: '¿Cuánto cuesta PropSync?', a: 'El precio se cotiza según el plan (Individual o Pro) y el tamaño de tu equipo. Todas las cuentas empiezan con 15 días de prueba gratis, sin tarjeta de crédito. Escríbenos y te enviamos una propuesta para tu agencia.' },
      { q: '¿Puedo migrar mis propiedades desde Wasi u otro sistema?', a: 'Sí. PropSync importa tu inventario desde Wasi con sincronización diaria automática, desde cualquier archivo XML de propiedades y tus contactos desde CSV. No tienes que volver a cargar tu cartera a mano.' },
      { q: '¿Necesito instalar algo?', a: 'No. PropSync funciona en el navegador, en computadora y en celular, sin instalaciones. La app para iPhone y Android está en camino.' },
      { q: '¿Puedo verlo antes de registrarme?', a: 'Sí. La demo pública te deja entrar a una inmobiliaria de ejemplo con propiedades y clientes de muestra, sin registrarte. Los datos se reinician cada día, así que puedes crear, editar y mover leads con libertad.' },
    ],
  },

  en: {
    badge: 'AI real-estate CRM · Built in Panama',
    h1: 'Your agency,',
    cycle: ['Centralized.', 'With native CRM.', 'AI-powered.'],
    sub: 'PropSync is the AI-powered real-estate CRM for Panama: your inventory, your clients and publishing to Encuentra24 and Compre o Alquile, in a single platform.',
    cta: 'Start for free',
    demo: 'Try the live demo',
    nav: { platform: 'Platform', marketing: 'Features', ai: 'AI', portals: 'Portals', faq: 'FAQ', pricing: 'Plans', contact: 'Contact' },
    stats: [
      { val: 'Encuentra24', label: '& Compre o Alquile', sub: 'automatic feed publishing' },
      { val: '15 days', label: 'Free trial', sub: 'no credit card' },
      { val: '360°', label: 'Virtual tours', sub: 'included with every listing' },
    ],

    platformBadge: 'Integral platform',
    platformTitle: 'Marketing, sales and communication — in one place.',
    platformSub: 'PropSync centralizes your entire real estate business operation. From the first lead contact to deal close, without leaving the platform.',
    platformPills: ['Property database', 'Native CRM', 'Marketing automation', 'Lead capture', 'AI assistant', '360° virtual tour', 'REST API', 'Public property page', 'Mobile app (coming soon)', 'Reports', 'Multi-user', 'Meta Lead Ads'],

    howTitle: 'Three pillars',
    howSub: 'A platform built on what truly matters',
    steps: [
      { n: '01', t: 'Central property database', b: 'Import from Wasi, upload manually, or connect your sources. PropSync creates a single, structured database of your entire inventory — no duplicates, always up to date.' },
      { n: '02', t: 'Native integrated CRM', b: 'Full pipeline with stages, assigned clients, follow-ups, immutable notes and complete history — all inside PropSync, no external apps required.' },
      { n: '03', t: 'Artificial intelligence', b: 'The AI assistant drafts descriptions, answers questions about your portfolio, analyzes trends, and contacts property owners automatically.' },
    ],

    mktTitle: 'Marketing automation and lead capture',
    mktSub: 'Your website captures leads directly into your CRM. PropSync nurtures them automatically via WhatsApp, email, and follow-up until close.',
    mktPoints: [
      'Meta Lead Ads and web forms capture leads straight to your CRM',
      'Automated WhatsApp and email campaigns',
      'Automatic follow-up of interested buyers per property',
      'Alerts for new matching properties to existing leads',
      'Conversion reports: lead → close',
    ],
    mktNoti: [
      { title: 'New lead captured', l1: 'María García · maria@gmail.com', l2: 'Interested in: Apto Punta Pacífica', time: '2 min' },
      { title: 'WhatsApp sent automatically', l1: 'José Rodríguez · owner', l2: 'Availability verification', time: '5 min' },
      { title: 'Availability confirmed', l1: 'Casa Costa del Este · #B-1823', l2: 'Status updated in database', time: '8 min' },
    ],

    agentTitle: 'The agent that never sleeps',
    agentSub: 'An AI assistant that contacts property owners, updates availability, answers clients, and keeps your entire inventory active — without human intervention.',
    agentPoints: [
      'Contacts owners automatically via WhatsApp',
      'Updates availability in real time',
      'Answers client inquiries 24/7',
      'Drafts and optimizes property descriptions',
      'Schedules visits and syncs the CRM',
      'Detects and alerts on inactive listings',
    ],
    agentChat: {
      header: 'PropSync AI',
      online: 'online',
      msg1: 'Hi José! I\'m the assistant from Las Palmas Realty. Your property in Punta Pacífica (#A-2341) — is it still available for visits? 🏠',
      time1: '1:42 PM',
      reply: 'Yes, available. They can visit Tuesday and Thursday 👍',
      time2: '1:45 PM',
      updates: ['Property #A-2341 → Available', 'Database updated', '3 interested buyers notified', 'Visits: Tue & Thu scheduled'],
      time3: '1:45 PM',
    },

    webApiTitle: 'Connect your website and tech stack',
    webApiSub: 'PropSync integrates with your existing website and exposes a full REST API to connect any tool.',
    webTitle: 'Your inventory, visible on the web',
    webSub: 'Every property gets a public page with photos and a downloadable PDF, and its 360° tour embeds on any website with one line of code.',
    apiTitle: 'REST API + Webhooks',
    apiSub: 'Full access to your inventory from any application. Real-time webhooks for advanced integrations.',
    apiFeatures: ['API key authentication', 'Full inventory export with photos', 'Pagination and safe rate limits', 'Public page and PDF per property', 'Embeddable 360° tours via iframe'],

    plansTitle: 'Plans',
    plansSub: 'Choose the tier that fits your agency · Custom quote',
    trialBadge: '15-day free trial',
    trialSub: 'No credit card · Cancel anytime',
    plans: [
      { n: 'Individual', d: 'For independent agents', f: ['50 properties', 'Centralized database', 'Basic CRM', 'Limited AI assistant', 'Portal connections (Compre o Alquile, Encuentra24, Web page)', '1 user'], cta: 'Start 15-day free trial' },
      { n: 'Pro', d: 'For growing teams', popular: true, f: ['Unlimited properties', 'Full CRM + pipeline', 'Full AI assistant', 'Portal connections (Compre o Alquile, Encuentra24, Web page)', '2 users (extra users available)', 'Integration API'], cta: 'Start 15-day free trial' },
    ],

    ctaBand: 'Your agency, in one platform.',
    ctaBandSub: 'No credit card. No installations.',
    ctaBandBtn: 'Create free account',
    footerTagline: 'Marketing · CRM · AI for real estate.',
    credit: 'Created by',

    // 3D Tours
    tourBadge: 'Virtual walkthroughs',
    tourTitle: 'Virtual 360° tour for every property.',
    tourSub: 'Your clients walk through any property from anywhere in the world. Upload regular or 360° panoramic photos — PropSync creates the tour and generates a shareable link and embed code for your website.',
    tourPoints: [
      'Regular photos with immersive Ken Burns animation',
      '360° panoramic photos with free-look navigation',
      'Public shareable link for each property',
      'Iframe embed code for any website',
      'Reduces unnecessary visits and speeds close',
      'Works on desktop and mobile — no apps required',
    ],
    tourLabel: '360° Tour · Floor 8 · 120 m²',
    tourDemo: 'View demo',

    // How it works step-by-step
    howWorksTitle: 'How it works',
    howWorksSub: 'From zero to fully operational in minutes',
    howWorksSteps: [
      { n: '01', t: 'Connect your sources', b: 'Import from Wasi in one click, upload manually, or connect your web forms and Meta Lead Ads. PropSync unifies everything.' },
      { n: '02', t: 'Build your inventory', b: 'Every property has a complete profile: photos, price, area, 360° tour, notes, and history. No duplicates, always up to date.' },
      { n: '03', t: 'Capture and manage leads', b: 'Leads arrive from your website, Meta Ads, or manually. The Kanban CRM organizes them: New → Contacted → Visit → Offer → Closed.' },
      { n: '04', t: 'Automate follow-ups', b: 'Email notifications, automatic reminders, and follow-up alerts. Your team always knows what to do and when.' },
      { n: '05', t: 'Publish and close', b: 'Choose which portals each listing goes to and Encuentra24 and Compre o Alquile pick it up from your feed automatically. Share 360° tours and see which source closes the most deals.' },
    ],

    // Contact
    contactTitle: 'Have questions?',
    contactSub: 'Our team is ready to help you get PropSync set up for your agency. Write to us or give us a call.',
    contactPhone: '+507 6513-9139',
    contactEmail: 'gerencia@elevarewebservices.com',
    contactTypes: [
      { value: 'soporte', label: 'Technical support' },
      { value: 'ventas',  label: 'Sales inquiry' },
      { value: 'otro',    label: 'Other' },
    ],
    contactFields: {
      name: 'Your name',
      email: 'Your email',
      type: 'Inquiry type',
      message: 'Tell us how we can help...',
      send: 'Send message',
      sending: 'Sending...',
      sent: 'Message sent! We\'ll be in touch soon.',
      error: 'Could not send.',
    },

    // Add-on services
    addonsBadge: 'Add-on services',
    addonsTitle: 'Supercharge your agency with managed integrations',
    addonsSub: 'These integrations require custom setup. The Elevare team installs and manages them for you.',
    addons: [
      {
        icon: '',
        tag: 'Add-on',
        name: 'WhatsApp for property owners',
        description: 'Automate outreach to property owners via WhatsApp to verify availability. The system sends bulk messages, processes responses, and automatically updates each property\'s status in PropSync.',
        includes: ['WhatsApp Business API integration', 'Bulk messaging to property owners', 'Automatic response processing', 'Automatic availability updates'],
        cta: 'Inquire',
      },
      {
        icon: '',
        tag: 'Add-on',
        name: 'Automated follow-ups',
        description: 'Multi-step follow-up sequences that run on their own. You define the steps — day 0, day 3, day 7 — and each lead moves through the sequence until they reply. The moment they answer, the sequence stops itself and the contact is flagged in the CRM.',
        includes: ['Multi-step sequences configurable per stage', 'Delivery over WhatsApp (Twilio) and email', 'Automatic stop when the lead replies', 'Every step logged in the contact history'],
        cta: 'Inquire',
      },
    ] as { icon: string; tag: string; name: string; description: string; includes: string[]; cta: string }[],
    addonsNote: 'Managed by Elevare · Scope defined per configuration',

    // Portal publishing
    portalsBadge: 'Portal publishing',
    portalsTitle: 'Publish to Encuentra24 and Compre o Alquile without copy-pasting.',
    portalsSub: 'PropSync generates a private XML feed for each portal. You choose which portals each listing goes to and the portal picks it up automatically on its next read, usually once a day. Sell it, rent it or deactivate it and it leaves the portals on its own. Photos, price, location, features and the 360° tour travel with every listing.',
    portalsSteps: [
      { t: 'Pick the portals', b: 'On each listing choose Encuentra24, Compre o Alquile or both.' },
      { t: 'The portal reads your feed', b: 'Each portal fetches your private URL and publishes or updates your listings.' },
      { t: 'Everything stays current', b: 'Price, photos and availability update themselves; sold listings disappear.' },
    ],
    portalsNote: 'The connection is activated once per portal with your agency account. The Elevare team walks you through it.',
    portalsMock: { title: 'Publishing channels', live: 'In feed', sold: 'Sold · out of feed' },

    // FAQ
    faqBadge: 'FAQ',
    faqTitle: 'What agencies ask us',
    faq: [
      { q: 'What is PropSync?', a: 'PropSync is an AI-powered real-estate CRM built for agencies and independent agents in Panama. It brings together the property database, a client CRM with a Kanban pipeline, 360° virtual tours, an AI assistant and publishing to Encuentra24 and Compre o Alquile. It is built by Elevare, a Panamanian company.' },
      { q: 'Does PropSync publish to Encuentra24 and Compre o Alquile?', a: 'Yes. Every agency gets a private XML feed per portal. Mark the portals on each listing and the portal publishes and updates it on its next read, usually within 24 hours. Sold, rented or deactivated listings leave the feed automatically.' },
      { q: 'Does it work for an independent agent?', a: 'Yes. The Individual plan is built for a single user: up to 100 listings, CRM, AI assistant and portal connection. Teams use the Pro plan, with unlimited listings, multiple users and an integration API.' },
      { q: 'How much does PropSync cost?', a: 'Pricing is quoted by plan (Individual or Pro) and team size. Every account starts with a 15-day free trial, no credit card required. Write to us and we will send a proposal for your agency.' },
      { q: 'Can I migrate my listings from Wasi or another system?', a: 'Yes. PropSync imports your inventory from Wasi with automatic daily sync, from any property XML file, and your contacts from CSV. No need to re-enter your portfolio by hand.' },
      { q: 'Do I need to install anything?', a: 'No. PropSync runs in the browser, on desktop and mobile, with nothing to install. The iPhone and Android app is on the way.' },
      { q: 'Can I see it before signing up?', a: 'Yes. The public demo lets you into a sample agency with example listings and clients, no sign-up needed. Data resets every day, so you can create, edit and move leads freely.' },
    ],
  },
}
type Lang = 'es' | 'en'

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({ children, delay = 0, from = 'bottom', className = '' }: {
  children: React.ReactNode; delay?: number; from?: 'bottom' | 'left' | 'right'; className?: string
}) {
  const { ref, visible } = useReveal()
  const transforms: Record<string, string> = {
    bottom: visible ? 'translateY(0)' : 'translateY(36px)',
    left:   visible ? 'translateX(0)' : 'translateX(-44px)',
    right:  visible ? 'translateX(0)' : 'translateX(44px)',
  }
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: transforms[from],
      transition: `opacity 0.85s ${delay}ms cubic-bezier(.16,1,.3,1), transform 0.85s ${delay}ms cubic-bezier(.16,1,.3,1)`,
    }}>
      {children}
    </div>
  )
}

const F = 'var(--font-outfit), sans-serif'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('es')
  const [scrolled, setScrolled] = useState(false)
  const [cycleIdx, setCycleIdx] = useState(0)
  const [cycleFade, setCycleFade] = useState(true)
  // Inside the native app the marketing landing is useless — send users
  // straight into the app (middleware bounces them to /login if no session).
  const [isNative, setIsNative] = useState(false)
  const t = T[lang]

  useEffect(() => {
    if (isNativeApp()) {
      setIsNative(true)
      router.replace('/dashboard')
    }
  }, [router])

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setCycleFade(false)
      const tid = setTimeout(() => { setCycleIdx(i => (i + 1) % t.cycle.length); setCycleFade(true) }, 380)
      return () => clearTimeout(tid)
    }, 2800)
    return () => clearInterval(id)
  }, [t.cycle.length])

  const toggleLang = useCallback(() => setLang(l => l === 'es' ? 'en' : 'es'), [])

  const [contactForm, setContactForm] = useState({ name: '', email: '', type: 'soporte', message: '' })
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [contactError, setContactError]   = useState('')

  // Feature carousel
  const CAROUSEL_COUNT = 5
  const [featureTab, setFeatureTab] = useState(0)
  const [tabProgress, setTabProgress] = useState(0)
  const [fadingTab, setFadingTab] = useState(false)
  const pausedUntilRef = useRef(0)

  const switchTab = useCallback((i: number) => {
    setFadingTab(true)
    setTimeout(() => { setFeatureTab(i); setTabProgress(0); setFadingTab(false) }, 180)
  }, [])

  useEffect(() => {
    const STEP_MS = 45
    const TOTAL_MS = 4500
    let elapsed = 0
    const id = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return
      elapsed += STEP_MS
      setTabProgress(Math.min(100, (elapsed / TOTAL_MS) * 100))
      if (elapsed >= TOTAL_MS) {
        elapsed = 0
        setFadingTab(true)
        setTimeout(() => {
          setFeatureTab(t => (t + 1) % CAROUSEL_COUNT)
          setTabProgress(0)
          setFadingTab(false)
        }, 180)
      }
    }, STEP_MS)
    return () => clearInterval(id)
  }, [])

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Lightweight client-side email validation — same rule as the rest of the app
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRe.test(contactForm.email.trim())) {
      setContactStatus('error')
      setContactError(lang === 'es' ? 'Por favor ingresa un email válido' : 'Please enter a valid email')
      return
    }
    setContactStatus('sending')
    setContactError('')
    try {
      const res  = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contactForm) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setContactStatus('sent')
      setContactForm({ name: '', email: '', type: 'soporte', message: '' })
    } catch (err) {
      setContactStatus('error')
      setContactError(err instanceof Error ? err.message : 'Error')
    }
  }

  // Native app: render nothing while we redirect into the app shell, so the
  // marketing page never flashes inside the WebView.
  if (isNative) return null

  return (
    <div className="ml" style={{ overflowX: 'hidden', fontFamily: F, minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://www.propsyncia.com/#org',
                name: 'PropSync',
                url: 'https://www.propsyncia.com',
                logo: 'https://www.propsyncia.com/icon-mark-1024.png',
                email: 'gerencia@elevarewebservices.com',
                telephone: '+507 6513-9139',
                address: { '@type': 'PostalAddress', addressCountry: 'PA' },
                parentOrganization: { '@type': 'Organization', name: 'Elevare Tech & Marketing', url: 'https://elevarewebservices.com' },
              },
              {
                '@type': 'WebSite',
                '@id': 'https://www.propsyncia.com/#website',
                url: 'https://www.propsyncia.com',
                name: 'PropSync',
                inLanguage: 'es-PA',
                publisher: { '@id': 'https://www.propsyncia.com/#org' },
              },
              {
                '@type': 'SoftwareApplication',
                name: 'PropSync',
                url: 'https://www.propsyncia.com',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                description:
                  'CRM inmobiliario con IA para Panamá: base de datos de propiedades, CRM nativo, tours virtuales 360° y publicación en portales (Encuentra24, Compre o Alquile).',
                inLanguage: ['es', 'en'],
                publisher: { '@id': 'https://www.propsyncia.com/#org' },
                // Señales geográficas explícitas. Sin esto, "CRM inmobiliario"
                // y "Panamá" sólo se relacionan en prosa; declararlo como dato
                // estructurado es lo que permite a un motor responder "¿qué CRM
                // inmobiliario hay en Panamá?" con esta entidad.
                areaServed: {
                  '@type': 'Country',
                  name: 'Panamá',
                  identifier: 'PA',
                },
                audience: {
                  '@type': 'BusinessAudience',
                  name: 'Inmobiliarias, corredores y agentes de bienes raíces en Panamá',
                  geographicArea: { '@type': 'Country', name: 'Panamá' },
                },
                featureList: [
                  'Base de datos centralizada de propiedades',
                  'CRM inmobiliario con pipeline Kanban configurable',
                  'Asistente con inteligencia artificial sobre el inventario y el CRM',
                  'Tours virtuales 360° embebibles',
                  'Publicación automática en Encuentra24 y Compre o Alquile mediante feed XML',
                  'Importación desde Wasi y desde feeds XML',
                  'Automatización de seguimiento por WhatsApp',
                  'API REST de integración',
                ],
                // Se ofrece también bajo marca del cliente.
                offers: {
                  '@type': 'Offer',
                  availability: 'https://schema.org/InStock',
                  url: 'https://www.propsyncia.com/precios',
                  description: 'Cotización a medida según el tamaño del equipo. Disponible en modalidad White Label.',
                },
              },
            ],
          }),
        }}
      />
      <style suppressHydrationWarning>{`
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item[open] .faq-plus { transform: rotate(45deg); }
        /* ── Monoline: cero croma ──────────────────────────────────────────
           Todos los tokens son oklch con C=0. No hay color en toda la página;
           la única excepción viva es el logo, que es un PNG y conserva el
           degradado de marca por sí solo. La estructura sale de bordes y
           espacio en blanco, nunca de relleno de color ni de sombra.        */
        .ml {
          --ml-bg: oklch(0.145 0 0);
          --ml-fg: oklch(0.985 0 0);
          --ml-muted: oklch(0.708 0 0);
          --ml-border: oklch(1 0 0 / 12%);
          --ml-border-soft: oklch(1 0 0 / 7%);
          background: var(--ml-bg);
          color: var(--ml-fg);
        }

        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.45} 50%{opacity:1} }

        /* La única textura de la página, y sólo en el hero. */
        .line-pattern {
          background-image: repeating-linear-gradient(
            115deg,
            transparent,
            transparent 55px,
            var(--ml-border-soft) 55px,
            var(--ml-border-soft) 56px
          );
        }

        /* Antes .glass hacía blur + relleno translúcido. En monoline un panel
           es sólo un borde: sin sombra, sin elevación, sin backdrop-filter. */
        .glass { background:transparent; border:1px solid var(--ml-border); }
        .glass-strong { background:transparent; border:1px solid var(--ml-border); }

        /* .amber-grad era el degradado ámbar→índigo recortado sobre texto.
           Se mantiene el nombre para no tocar 4 llamadas en el JSX, pero ahora
           es simplemente el color de texto principal. */
        .amber-grad { background:none; -webkit-text-fill-color:currentColor; color:var(--ml-fg); }

        /* Único botón sólido de la página: el punto de máximo contraste. */
        .pill-cta { background:var(--ml-fg); color:var(--ml-bg); border-radius:.375rem; font-weight:500; font-family:${F}; transition:opacity .2s ease; display:inline-flex; align-items:center; gap:7px; }
        .pill-cta:hover { opacity:.86; }
        .ghost-cta { color:var(--ml-muted); transition:color .2s; display:inline-flex; align-items:center; gap:8px; }
        .ghost-cta:hover { color:var(--ml-fg); }

        .nav-pill { background:transparent; border:1px solid var(--ml-border); border-radius:.375rem; align-items:center; padding:4px 6px; gap:2px; } /* display comes from Tailwind "hidden md:flex" — setting it here showed the pill on phones over the logo */
        .nav-link { padding:6px 12px; border-radius:.25rem; font-size:.8rem; font-weight:400; color:var(--ml-muted); transition:all .2s; white-space:nowrap; }
        .nav-link:hover { color:var(--ml-fg); background:oklch(1 0 0 / 6%); }

        .step-num { font-size:clamp(2.75rem,6vw,4rem); font-weight:600; line-height:1; letter-spacing:-.04em; color:var(--ml-border); user-select:none; flex-shrink:0; font-family:${F}; }
        .check-dot::before { content:""; display:inline-block; width:5px; height:5px; border-radius:50%; background:var(--ml-muted); margin-right:10px; flex-shrink:0; }

        .code-block { background:transparent; border:1px solid var(--ml-border); border-radius:.375rem; overflow:hidden; }
        .terminal-bar { background:transparent; padding:10px 16px; display:flex; align-items:center; gap:6px; border-bottom:1px solid var(--ml-border); }
        .dot-r, .dot-y, .dot-g { width:9px; height:9px; border-radius:50%; border:1px solid var(--ml-border); background:transparent; }
        pre { margin:0; padding:18px; font-size:.73rem; line-height:1.7; color:var(--ml-muted); overflow:auto; font-family:"Fira Code","Cascadia Code","Courier New",monospace; white-space:pre; }
        /* El resaltado de sintaxis también es acromático: sólo pesos y grises. */
        .kw { color:var(--ml-fg); font-weight:500; }
        .str { color:var(--ml-muted); }
        .cm { color:oklch(1 0 0 / 28%); }
        .at { color:var(--ml-fg); }
        .val { color:var(--ml-muted); }

        .section-label { font-size:.72rem; font-weight:500; color:var(--ml-muted); margin-bottom:.6rem; display:block; font-family:${F}; letter-spacing:0; text-transform:none; }
        .h2 { font-size:clamp(1.6rem,3.6vw,2.25rem); font-weight:600; letter-spacing:-.025em; line-height:1.2; font-family:${F}; text-wrap:balance; }
        .body-text { color:var(--ml-muted); font-size:.95rem; line-height:1.7; font-weight:400; font-family:${F}; text-wrap:pretty; }
        .divider { border:none; border-top:1px solid var(--ml-border); margin:0; }

        /* Ritmo vertical unificado y más apretado de lo que estaba. */
        .ml-section { padding-top:3.5rem; padding-bottom:3.5rem; }
        @media (min-width:768px){ .ml-section { padding-top:4.5rem; padding-bottom:4.5rem; } }
      `}</style>

      {/* Sin capa de estrellas ni halos radiales: el fondo es un único color
          plano (--ml-bg). La única textura de la página es el patrón de líneas
          diagonales del hero. */}

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0" style={{ zIndex: 50 }}>
        <div className={`transition-all duration-500 ${scrolled ? 'py-2' : 'py-5'}`}
             style={scrolled ? { background: 'oklch(0.145 0 0 / 92%)', borderBottom: '1px solid var(--ml-border)' } : undefined}>
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center" aria-label="PropSync inicio">
              <Image src="/logo-lockup.png" alt="PropSync" width={130} height={32} priority style={{ width: 'auto', height: 32, display: 'block' }} />
            </Link>
            <div className="nav-pill hidden md:flex">
              <a href="#platform" className="nav-link">{t.nav.platform}</a>
              <a href="#features" className="nav-link">{t.nav.marketing}</a>
              <a href="#portales" className="nav-link">{t.nav.portals}</a>
              <a href="#pricing" className="nav-link">{t.nav.pricing}</a>
              <a href="#faq" className="nav-link">{t.nav.faq}</a>
              <Link href="/demo" className="nav-link">Demo</Link>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggleLang} className="text-xs px-3 py-1.5 rounded-md transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,.13)', color: 'rgba(255,255,255,.38)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.75)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.38)')}>
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
              <Link href="/login" className="text-sm px-4 py-2 rounded-md transition-colors hidden sm:inline-flex"
                    style={{ color: 'rgba(255,255,255,.55)', border: '1px solid rgba(255,255,255,.13)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.9)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.3)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.55)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.13)' }}>
                {lang === 'es' ? 'Iniciar sesión' : 'Log in'}
              </Link>
              <Link href="/registro" className="pill-cta px-5 py-2 text-sm">
                {t.cta}
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 9.5L9.5 1.5M9.5 1.5H3.5M9.5 1.5V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="line-pattern relative border-b" style={{ borderColor: 'var(--ml-border)', zIndex: 10 }}>
        <div className="relative flex flex-col items-center text-center px-6 pt-28 pb-14" style={{ background: 'oklch(0.145 0 0 / 88%)' }}>
        <div style={{ animation: 'fadeUp .65s .05s ease both', opacity: 0 }}>
          <span className="inline-flex items-center gap-2.5 text-xs px-4 py-2 rounded-md" style={{ border: '1px solid var(--ml-border)', color: 'var(--ml-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
            {t.badge}
          </span>
        </div>
        <h1 style={{ marginTop: '1.75rem', fontSize: 'clamp(3.2rem,9vw,6.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.05, animation: 'fadeUp .65s .15s ease both', opacity: 0, fontFamily: F }}>
          {t.h1}
          {/* One H1 for crawlers: the cycling word is part of the heading, not
              a separate H2. aria-live off so screen readers aren't spammed. */}
          <span className="amber-grad" aria-live="off" style={{ display: 'block', marginTop: '.12em', fontWeight: 700, opacity: cycleFade ? 1 : 0, transition: 'opacity .38s ease' }}>
            {t.cycle[cycleIdx]}
          </span>
        </h1>
        <p style={{ marginTop: '1.5rem', maxWidth: '520px', fontSize: '1rem', lineHeight: 1.78, color: 'rgba(255,255,255,.38)', animation: 'fadeUp .65s .35s ease both', opacity: 0, fontFamily: F, fontWeight: 300 }}>
          {t.sub}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4" style={{ marginTop: '2.5rem', animation: 'fadeUp .65s .5s ease both', opacity: 0 }}>
          <Link href="/registro" className="pill-cta px-8 py-3.5 text-sm">{t.cta}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 11.5L11.5 1.5M11.5 1.5H3.5M11.5 1.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
          <Link href="/demo" className="ghost-cta text-sm py-3.5">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="rgba(255,255,255,.22)" strokeWidth="1"/><path d="M8 7l6 3-6 3V7z" fill="rgba(255,255,255,.45)"/></svg>
            {t.demo}
          </Link>
        </div>

        {/* Antes aquí vivía el orbe iridiscente flotante. En monoline no hay
            gradientes radiales ni animación decorativa, así que los tres datos
            que lo rodeaban pasan a una fila plana separada por bordes. */}
        <div className="w-full max-w-3xl mx-auto" style={{ marginTop: '2.75rem' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ borderTop: '1px solid var(--ml-border)' }}>
            {t.stats.map((stat, i) => (
              <div
                key={i}
                className={`text-left ${i < 2 ? 'sm:border-r' : ''}`}
                style={{
                  padding: '1.25rem 1.25rem 1.5rem',
                  borderBottom: '1px solid var(--ml-border)',
                  borderColor: 'var(--ml-border)',
                }}
              >
                <div style={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-.03em', fontFamily: F }}>{stat.val}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--ml-fg)', fontWeight: 500, marginTop: 6 }}>{stat.label}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--ml-muted)', marginTop: 3 }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>

      {/* ── Platform statement ─────────────────────────────────────────────── */}
      <section id="platform" className="px-6 ml-section" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="rounded-3xl p-10 md:p-16" style={{ border: '1px solid var(--ml-border)' }}>
              <span className="section-label">{t.platformBadge}</span>
              <h2 className="h2" style={{ maxWidth: 600, marginBottom: '1rem' }}>{t.platformTitle}</h2>
              <p className="body-text" style={{ maxWidth: 540, marginBottom: '2rem' }}>{t.platformSub}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {t.platformPills.map((pill, i) => (
                  <span key={i} style={{ padding: '5px 14px', borderRadius: 9999, fontSize: '.78rem', background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Feature carousel ──────────────────────────────────────────────── */}
      <section id="features" className="ml-section px-6" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-5xl mx-auto">
          {/* Tabs */}
          <div role="tablist" style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' as const }}>
            {([
              lang === 'es' ? 'Marketing & Leads' : 'Marketing & Leads',
              lang === 'es' ? 'Asistente IA' : 'AI Assistant',
              lang === 'es' ? 'Tours 360°' : '360° Tours',
              'Web + API',
              'Add-ons',
            ] as string[]).map((label, i) => (
              <button key={i} role="tab" aria-selected={featureTab === i}
                onClick={() => { switchTab(i); pausedUntilRef.current = Date.now() + 12000 }}
                style={{ whiteSpace: 'nowrap', padding: '7px 18px', borderRadius: 9999, fontSize: '.78rem', fontFamily: F, border: 'none', cursor: 'pointer', background: featureTab === i ? 'oklch(1 0 0 / 6%)' : 'transparent', color: featureTab === i ? 'oklch(0.985 0 0)' : 'rgba(255,255,255,.35)', transition: 'all .2s', outline: 'none' }}>
                {label}
              </button>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ height: 1, background: 'rgba(255,255,255,.07)', marginBottom: '2.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${tabProgress}%`, background: 'oklch(1 0 0 / 60%)', transition: 'width .045s linear' }} />
          </div>
          {/* Content */}
          <div style={{ opacity: fadingTab ? 0 : 1, transition: 'opacity .18s ease', minHeight: 360 }}>
            <div className="grid md:grid-cols-2 gap-10 items-center">
              {/* Left: text */}
              <div>
                <div hidden={featureTab !== 0}>
                  <span className="section-label">{lang === 'es' ? 'Marketing & Leads' : 'Marketing & Leads'}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.mktTitle}</h2>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.mktSub}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {t.mktPoints.map((p, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.875rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'oklch(1 0 0 / 70%)', marginTop: 2, flexShrink: 0 }}>→</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div hidden={featureTab !== 1}>
                  <span className="section-label">{lang === 'es' ? 'Asistente IA' : 'AI Assistant'}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.agentTitle}</h2>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: '1rem', padding: '4px 12px', borderRadius: 9999, background: 'transparent', border: '1px solid oklch(1 0 0 / 20%)' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'oklch(1 0 0 / 70%)', flexShrink: 0 }} />
                    <span style={{ fontSize: '.68rem', color: 'oklch(1 0 0 / 70%)', fontFamily: F, letterSpacing: '.05em' }}>{lang === 'es' ? 'WhatsApp requiere add-on · Contactar a Elevare' : 'WhatsApp requires add-on · Contact Elevare'}</span>
                  </div>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.agentSub}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {t.agentPoints.map((p, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.875rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'oklch(0.80 0 0)', marginTop: 2, flexShrink: 0, fontSize: '.7rem' }}>✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div hidden={featureTab !== 2}>
                  <span className="section-label">{t.tourBadge}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.tourTitle}</h2>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.tourSub}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {t.tourPoints.map((p, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '.875rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'oklch(1 0 0 / 70%)', marginTop: 2, flexShrink: 0 }}>→</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div hidden={featureTab !== 3}>
                  <span className="section-label">{lang === 'es' ? 'Integraciones' : 'Integrations'}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.webApiTitle}</h2>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.webApiSub}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {t.apiFeatures.map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem', color: 'rgba(255,255,255,.4)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'oklch(1 0 0 / 80%)', flexShrink: 0 }}>—</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div hidden={featureTab !== 4}>
                  <span className="section-label">{t.addonsBadge}</span>
                  <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.addonsTitle}</h2>
                  <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.addonsSub}</p>
                  <p style={{ fontSize: '.73rem', color: 'rgba(255,255,255,.2)', fontFamily: F, marginTop: '.5rem' }}>{t.addonsNote}</p>
                </div>
              </div>
              {/* Right: visual */}
              <div>
                <div hidden={featureTab !== 0}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', position: 'relative' }}>
                      {t.mktNoti.map((n, i) => (
                        <div key={i} className="glass rounded-2xl p-4 flex items-start gap-4">
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '.8rem', fontWeight: 500, color: 'rgba(255,255,255,.82)', marginBottom: 3, fontFamily: F }}>{n.title}</p>
                            <p style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F }}>{n.l1}</p>
                            <p style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.28)', fontFamily: F }}>{n.l2}</p>
                          </div>
                          <span style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.22)', flexShrink: 0, fontFamily: F }}>{lang === 'es' ? `hace ${n.time}` : `${n.time} ago`}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4, marginTop: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'oklch(0.80 0 0)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.25)', fontFamily: F }}>{lang === 'es' ? 'Actualizando en tiempo real' : 'Updating in real time'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div hidden={featureTab !== 1}>
                  <div style={{ maxWidth: 310, margin: '0 auto', position: 'relative' }}>
                    <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,.12)', background: 'oklch(0.17 0 0)', position: 'relative' }}>
                      <div style={{ background: 'oklch(0.21 0 0)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'oklch(1 0 0 / 12%)', border: '1px solid var(--ml-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.95rem' }}></div>
                        <div>
                          <p style={{ fontSize: '.82rem', fontWeight: 500, color: 'rgba(255,255,255,.9)', fontFamily: F }}>{t.agentChat.header}</p>
                          <p style={{ fontSize: '.62rem', color: 'oklch(0.80 0 0)', fontFamily: F }}>{t.agentChat.online}</p>
                        </div>
                      </div>
                      <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div><div style={{ background: 'oklch(0.24 0 0)', borderRadius: '2px 12px 12px 12px', padding: '9px 11px' }}>
                          <p style={{ fontSize: '.74rem', color: 'rgba(255,255,255,.78)', lineHeight: 1.55, fontFamily: F, fontWeight: 300 }}>{t.agentChat.msg1}</p>
                          <p style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.22)', textAlign: 'right', marginTop: 4, fontFamily: F }}>{t.agentChat.time1} ✓✓</p>
                        </div></div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <div style={{ background: 'oklch(0.26 0 0)', borderRadius: '12px 2px 12px 12px', padding: '9px 11px', maxWidth: '78%' }}>
                            <p style={{ fontSize: '.74rem', color: 'rgba(255,255,255,.82)', lineHeight: 1.55, fontFamily: F, fontWeight: 300 }}>{t.agentChat.reply}</p>
                            <p style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.22)', textAlign: 'right', marginTop: 4, fontFamily: F }}>{t.agentChat.time2} ✓✓</p>
                          </div>
                        </div>
                        <div style={{ background: 'oklch(1 0 0 / 6%)', border: '1px solid var(--ml-border)', borderRadius: '2px 12px 12px 12px', padding: '9px 11px' }}>
                          {t.agentChat.updates.map((u, i) => (
                            <p key={i} style={{ fontSize: '.7rem', color: 'oklch(0.88 0 0)', lineHeight: 1.7, fontFamily: F, fontWeight: 300 }}>✓ {u}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div hidden={featureTab !== 2}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ borderRadius: '1.5rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,.12)', background: 'oklch(0.16 0 0)' }}>
                      <div style={{ height: 260, position: 'relative', overflow: 'hidden', background: 'oklch(0.19 0 0)' }}>
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '160%', height: '52%', background: 'oklch(0.26 0 0)', clipPath: 'polygon(18% 100%,82% 100%,92% 0%,8% 0%)' }} />
                        <div style={{ position: 'absolute', top: 0, left: '8%', width: '84%', height: '62%', background: 'oklch(0.23 0 0)', clipPath: 'polygon(0% 100%,100% 100%,88% 0%,12% 0%)' }} />
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '20%', height: '100%', background: 'oklch(0.16 0 0)', clipPath: 'polygon(0% 0%,100% 18%,100% 82%,0% 100%)' }} />
                        <div style={{ position: 'absolute', top: 0, right: 0, width: '20%', height: '100%', background: 'oklch(0.16 0 0)', clipPath: 'polygon(0% 18%,100% 0%,100% 100%,0% 82%)' }} />
                        <div style={{ position: 'absolute', top: '12%', right: '24%', width: 52, height: 72, background: 'oklch(1 0 0 / 6%)', borderRadius: 3 }} />
                        <div style={{ position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)', width: 120, height: 28, background: 'rgba(20,40,80,.8)', borderRadius: '6px 6px 0 0', border: '1px solid rgba(255,255,255,.06)' }} />
                        <div style={{ position: 'absolute', top: 12, left: 12, background: 'oklch(0.145 0 0 / 85%)', borderRadius: 8, padding: '4px 10px', border: '1px solid rgba(255,255,255,.12)' }}>
                          <span style={{ fontSize: '.62rem', color: 'rgba(255,255,255,.7)', fontFamily: F, letterSpacing: '.08em' }}>360° · 3D</span>
                        </div>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6.5 4.5l8 4.5-8 4.5V4.5z" fill="rgba(255,255,255,.85)"/></svg>
                        </div>
                        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                          {[1,0,0,0].map((active, idx) => (
                            <span key={idx} style={{ width: active ? 16 : 5, height: 5, borderRadius: 9999, background: active ? 'oklch(1 0 0 / 80%)' : 'rgba(255,255,255,.2)' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,.07)' }}>
                        <span style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.45)', fontFamily: F }}>{t.tourLabel}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="rgba(255,255,255,.5)" strokeWidth="1"/><rect x="7" y="1" width="5" height="5" rx="1" stroke="rgba(255,255,255,.5)" strokeWidth="1"/><rect x="1" y="7" width="5" height="5" rx="1" stroke="rgba(255,255,255,.5)" strokeWidth="1"/><rect x="7" y="7" width="5" height="5" rx="1" stroke="rgba(255,255,255,.3)" strokeWidth="1" strokeDasharray="2 1"/></svg>
                          </div>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'oklch(1 0 0 / 6%)', border: '1px solid oklch(1 0 0 / 25%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" stroke="oklch(1 0 0 / 90%)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div hidden={featureTab !== 3}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="code-block">
                      <div className="terminal-bar"><span className="dot-r"/><span className="dot-y"/><span className="dot-g"/>
                        <span style={{ marginLeft: 8, fontSize: '.68rem', color: 'rgba(255,255,255,.28)', fontFamily: 'monospace' }}>index.html</span>
                      </div>
                      <pre>{`<span class="kw">&lt;iframe</span> <span class="at">src</span>=<span class="str">"https://propsyncia.com/tour/mi-propiedad?embed=true"</span>\n  <span class="at">width</span>=<span class="str">"100%"</span> <span class="at">height</span>=<span class="str">"480"</span> <span class="at">frameborder</span>=<span class="str">"0"</span> <span class="at">allowfullscreen</span><span class="kw">&gt;&lt;/iframe&gt;</span>`}</pre>
                    </div>
                    <div className="code-block">
                      <div className="terminal-bar"><span className="dot-r"/><span className="dot-y"/><span className="dot-g"/>
                        <span style={{ marginLeft: 8, fontSize: '.68rem', color: 'rgba(255,255,255,.28)', fontFamily: 'monospace' }}>curl</span>
                      </div>
                      <pre>{`<span class="val">curl</span> https://propsyncia.com/api/v1/properties \\\n  -H <span class="str">"Authorization: Bearer {api_key}"</span> \\\n  -G -d <span class="str">"limit=50"</span> -d <span class="str">"offset=0"</span>`}</pre>
                    </div>
                  </div>
                </div>
                <div hidden={featureTab !== 4}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {t.addons.map((addon, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', paddingTop: '1.25rem', borderTop: '1px solid var(--ml-border)' }}>
                        <span style={{ fontSize: '.72rem', color: 'var(--ml-muted)', fontFamily: F, fontWeight: 500 }}>{addon.tag}</span>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-.02em', fontFamily: F }}>{addon.name}</h3>
                        <p style={{ fontSize: '.85rem', color: 'var(--ml-muted)', lineHeight: 1.7, fontFamily: F, fontWeight: 400 }}>{addon.description}</p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', margin: '.15rem 0 .35rem' }}>
                          {addon.includes.map((inc, k) => (
                            <li key={k} className="check-dot" style={{ display: 'flex', alignItems: 'center', fontSize: '.8rem', color: 'var(--ml-muted)', fontFamily: F }}>{inc}</li>
                          ))}
                        </ul>
                        <a href="#contact" style={{ display: 'inline-flex', alignSelf: 'flex-start', fontSize: '.8rem', fontWeight: 500, fontFamily: F, color: 'var(--ml-fg)', textDecoration: 'underline', textUnderlineOffset: 4 }}>{addon.cta}</a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Portal publishing ───────────────────────────────────────────── */}
      <section id="portales" className="ml-section px-6" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <Reveal>
            <span className="section-label">{t.portalsBadge}</span>
            <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.portalsTitle}</h2>
            <p className="body-text" style={{ marginBottom: '1.75rem' }}>{t.portalsSub}</p>
            <ol style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {t.portalsSteps.map((step, i) => (
                <li key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '.7rem', fontFamily: F, color: 'var(--ml-muted)', border: '1px solid var(--ml-border)', borderRadius: 9999, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <div>
                    <h3 style={{ fontSize: '.95rem', fontWeight: 500, fontFamily: F, marginBottom: 2 }}>{step.t}</h3>
                    <p style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.45)', fontFamily: F, fontWeight: 300, lineHeight: 1.6 }}>{step.b}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.3)', fontFamily: F }}>{t.portalsNote}</p>
          </Reveal>
          <Reveal delay={120}>
            {/* Mock of the property form's "Lugares de publicación" + feed status. */}
            <div className="rounded-3xl overflow-hidden" style={{ border: '1px solid var(--ml-border)', background: 'oklch(0.17 0 0)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--ml-border)', fontSize: '.8rem', fontFamily: F, color: 'rgba(255,255,255,.75)' }}>{t.portalsMock.title}</div>
              {[
                { name: 'Apto · Costa del Este · 3 hab', portals: ['Encuentra24', 'Compre o Alquile'], live: true },
                { name: 'Casa · Clayton · 4 hab', portals: ['Encuentra24'], live: true },
                { name: 'PH · Punta Pacífica · 2 hab', portals: [] as string[], live: false },
              ].map((row, i) => (
                <div key={i} style={{ padding: '14px 18px', borderBottom: i < 2 ? '1px solid var(--ml-border)' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '.8rem', fontFamily: F, color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {row.portals.length ? row.portals.map((p) => (
                        <span key={p} style={{ fontSize: '.65rem', fontFamily: F, padding: '2px 9px', borderRadius: 9999, border: '1px solid oklch(1 0 0 / 22%)', color: 'oklch(1 0 0 / 75%)' }}>{p}</span>
                      )) : <span style={{ fontSize: '.65rem', fontFamily: F, color: 'rgba(255,255,255,.3)' }}>—</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '.65rem', fontFamily: F, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, color: row.live ? 'oklch(0.9 0 0)' : 'rgba(255,255,255,.35)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.live ? 'oklch(0.9 0 0)' : 'rgba(255,255,255,.2)' }} />
                    {row.live ? t.portalsMock.live : t.portalsMock.sold}
                  </span>
                </div>
              ))}
              <pre style={{ margin: 0, padding: '14px 18px', borderTop: '1px solid var(--ml-border)', fontSize: '.66rem', lineHeight: 1.6, color: 'rgba(255,255,255,.4)', fontFamily: 'ui-monospace, monospace', overflowX: 'auto', background: 'oklch(0.15 0 0)' }}>{`<propiedad>
  <operacion>venta</operacion>
  <precio moneda="USD">425000</precio>
  <imagenes>… 18 fotos …</imagenes>
  <tour_virtual>propsyncia.com/tour/…</tour_virtual>
</propiedad>`}</pre>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="como-funciona" className="ml-section px-6" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <span className="section-label">{t.howWorksTitle}</span>
            <h2 className="h2" style={{ marginBottom: '2.5rem', maxWidth: 560 }}>{t.howWorksSub}</h2>
          </Reveal>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-5" style={{ borderTop: '1px solid var(--ml-border)' }}>
            {t.howWorksSteps.map((step, i) => (
              <li key={step.n} style={{ padding: '1.5rem 1.25rem 1.75rem 0', borderBottom: '1px solid var(--ml-border)' }}>
                <Reveal delay={i * 60}>
                  <span style={{ fontSize: '.7rem', color: 'var(--ml-muted)', fontFamily: F, letterSpacing: '.1em' }}>{step.n}</span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 500, fontFamily: F, margin: '.5rem 0 .4rem', letterSpacing: '-.01em' }}>{step.t}</h3>
                  <p style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.42)', fontFamily: F, fontWeight: 300, lineHeight: 1.65 }}>{step.b}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="ml-section px-6" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <span className="section-label text-center block">{t.plansTitle}</span>
            <h2 className="h2 text-center mb-6">{t.plansSub}</h2>
            <div className="flex justify-center mb-10">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '10px 22px', borderRadius: '.375rem', border: '1px solid var(--ml-border)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'oklch(0.985 0 0)', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
                <span className="amber-grad" style={{ fontSize: '.875rem', fontWeight: 600, letterSpacing: '-.005em', fontFamily: F }}>{t.trialBadge}</span>
                <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300 }}>· {t.trialSub}</span>
              </div>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5 items-start max-w-2xl mx-auto">
            {t.plans.map((plan, i) => (
              <Reveal key={i} delay={i * 70}>
                <div style={{ borderRadius: '1.5rem', padding: '1.875rem', display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform .3s ease', ...(plan.popular ? { background: 'transparent', border: '1px solid oklch(1 0 0 / 12%)' } : { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }) }}
                     onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-5px)')}
                     onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                  {plan.popular && <span style={{ fontSize: '.62rem', letterSpacing: '.16em', color: 'oklch(0.985 0 0)', fontWeight: 600, display: 'block', marginBottom: '.75rem', textTransform: 'uppercase', fontFamily: F }}>Popular</span>}
                  <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.32)', marginBottom: '.35rem', fontFamily: F }}>{plan.d}</p>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 400, marginBottom: '1.25rem', fontFamily: F }}>{plan.n}</h3>
                  {/* Se vende como White Label: el precio lo fija cada
                      implementación, así que la tarjeta muestra el nivel y
                      manda a cotizar en vez de publicar una cifra. */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: '1.5rem' }}>
                    <span className="amber-grad" style={{ fontSize: '1.35rem', fontWeight: 300, letterSpacing: '-.02em', fontFamily: F }}>
                      {lang === 'es' ? 'Cotización a medida' : 'Custom quote'}
                    </span>
                  </div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', flex: 1, marginBottom: '1.5rem' }}>
                    {plan.f.map((feat, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem', fontSize: '.8rem', color: 'rgba(255,255,255,.42)', fontFamily: F, fontWeight: 300 }}>
                        <span style={{ color: 'oklch(1 0 0 / 45%)', flexShrink: 0, marginTop: 1 }}>—</span>{feat}
                      </li>
                    ))}
                  </ul>
                  {i === 2 ? (
                    <a href="#contact" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '.625rem 0', borderRadius: 9999, fontSize: '.8rem', fontWeight: 500, fontFamily: F, transition: 'all .2s', textDecoration: 'none', background: 'transparent', color: 'rgba(255,255,255,.42)', border: '1px solid rgba(255,255,255,.13)' }}>
                      {plan.cta}
                    </a>
                  ) : (
                    <Link href="/registro" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '.625rem 0', borderRadius: 9999, fontSize: '.8rem', fontWeight: 500, fontFamily: F, transition: 'all .2s', ...(plan.popular ? { background: 'oklch(1 0 0 / 8%)', color: 'oklch(0.985 0 0)', border: '1px solid oklch(1 0 0 / 12%)' } : { background: 'transparent', color: 'rgba(255,255,255,.42)', border: '1px solid rgba(255,255,255,.13)' }) }}>
                      {plan.cta}
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      {/* Native <details>: every answer is in the server HTML (crawlers and AI
          search read it without JS), and it opens without any client state. */}
      <section id="faq" className="ml-section px-6" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <span className="section-label">{t.faqBadge}</span>
            <h2 className="h2" style={{ marginBottom: '2rem' }}>{t.faqTitle}</h2>
          </Reveal>
          <div style={{ borderTop: '1px solid var(--ml-border)' }}>
            {t.faq.map((item, i) => (
              <details key={i} className="faq-item" open={i === 0} style={{ borderBottom: '1px solid var(--ml-border)' }}>
                <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '1.15rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 500, fontFamily: F, letterSpacing: '-.01em' }}>{item.q}</h3>
                  <span aria-hidden className="faq-plus" style={{ fontSize: '1.1rem', color: 'var(--ml-muted)', flexShrink: 0, transition: 'transform .2s' }}>+</span>
                </summary>
                <p style={{ fontSize: '.9rem', color: 'rgba(255,255,255,.5)', fontFamily: F, fontWeight: 300, lineHeight: 1.75, paddingBottom: '1.25rem', maxWidth: 680 }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ──────────────────────────────────────────────────────── */}
      <section className="ml-section px-6 text-center" style={{ zIndex: 10, position: 'relative' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)', fontWeight: 200, letterSpacing: '-.04em', lineHeight: 1.1, fontFamily: F }}>{t.ctaBand}</h2>
          <p style={{ color: 'rgba(255,255,255,.28)', marginTop: '.75rem', fontSize: '.95rem', fontFamily: F, fontWeight: 300 }}>{t.ctaBandSub}</p>
          <Link href="/registro" className="pill-cta inline-flex mt-7 px-10 py-4" style={{ fontSize: '.9375rem' }}>
            {t.ctaBandBtn}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 11.5L11.5 1.5M11.5 1.5H3.5M11.5 1.5V9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </Reveal>
      </section>

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" className="ml-section px-6" style={{ zIndex: 10, position: 'relative' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-start">

            {/* Info */}
            <Reveal from="left">
              <span className="section-label">{lang === 'es' ? 'Contacto' : 'Contact'}</span>
              <h2 className="h2" style={{ marginBottom: '1rem' }}>{t.contactTitle}</h2>
              <p className="body-text" style={{ marginBottom: '1.5rem' }}>{t.contactSub}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Phone */}
                <a href={`tel:${t.contactPhone.replace(/\s/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}
                   onMouseEnter={e => (e.currentTarget.style.opacity = '.75')}
                   onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'oklch(1 0 0 / 6%)', border: '1px solid oklch(1 0 0 / 20%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="oklch(1 0 0 / 85%)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.62 19.79 19.79 0 01.06 1.08 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.28)', fontFamily: F, marginBottom: 2 }}>{lang === 'es' ? 'Llámanos o WhatsApp' : 'Call or WhatsApp'}</p>
                    <p style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,.75)', fontFamily: F }}>{t.contactPhone}</p>
                  </div>
                </a>

                {/* Email */}
                <a href={`mailto:${t.contactEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}
                   onMouseEnter={e => (e.currentTarget.style.opacity = '.75')}
                   onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'oklch(1 0 0 / 6%)', border: '1px solid oklch(1 0 0 / 20%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="oklch(1 0 0 / 85%)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.28)', fontFamily: F, marginBottom: 2 }}>{lang === 'es' ? 'Email' : 'Email'}</p>
                    <p style={{ fontSize: '.9rem', fontWeight: 400, color: 'rgba(255,255,255,.75)', fontFamily: F }}>{t.contactEmail}</p>
                  </div>
                </a>
              </div>
            </Reveal>

            {/* Form */}
            <Reveal from="right" delay={80}>
              <div className="glass rounded-3xl p-8">
                {contactStatus === 'sent' ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'oklch(1 0 0 / 8%)', border: '1px solid var(--ml-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="oklch(0.80 0 0)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.75)', fontFamily: F }}>{t.contactFields.sent}</p>
                    <button onClick={() => setContactStatus('idle')} style={{ marginTop: '1.5rem', fontSize: '.8rem', color: 'rgba(255,255,255,.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>
                      {lang === 'es' ? 'Enviar otro mensaje' : 'Send another message'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>{t.contactFields.name}</label>
                        <input
                          required
                          value={contactForm.name}
                          onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                          style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => (e.target.style.borderColor = 'oklch(1 0 0 / 45%)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>{t.contactFields.email}</label>
                        <input
                          required
                          type="email"
                          value={contactForm.email}
                          onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                          style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => (e.target.style.borderColor = 'oklch(1 0 0 / 45%)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>{t.contactFields.type}</label>
                      <select
                        value={contactForm.type}
                        onChange={e => setContactForm(f => ({ ...f, type: e.target.value }))}
                        style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.7)', fontFamily: F, outline: 'none', cursor: 'pointer' }}
                        onFocus={e => (e.target.style.borderColor = 'oklch(1 0 0 / 45%)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                      >
                        {t.contactTypes.map(opt => (
                          <option key={opt.value} value={opt.value} style={{ background: 'oklch(0.20 0 0)', color: '#fff' }}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '.72rem', color: 'rgba(255,255,255,.38)', fontFamily: F, marginBottom: '.4rem' }}>{lang === 'es' ? 'Mensaje' : 'Message'}</label>
                      <textarea
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                        placeholder={t.contactFields.message}
                        style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 12px', fontSize: '.85rem', color: 'rgba(255,255,255,.8)', fontFamily: F, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                        onFocus={e => (e.target.style.borderColor = 'oklch(1 0 0 / 45%)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,.1)')}
                      />
                    </div>

                    {contactStatus === 'error' && (
                      <p style={{ fontSize: '.78rem', color: 'oklch(0.72 0 0)', fontFamily: F }}>{contactError || t.contactFields.error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={contactStatus === 'sending'}
                      className="pill-cta"
                      style={{ padding: '11px 0', justifyContent: 'center', fontSize: '.875rem', opacity: contactStatus === 'sending' ? .6 : 1 }}
                    >
                      {contactStatus === 'sending' ? t.contactFields.sending : t.contactFields.send}
                      {contactStatus !== 'sending' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="px-6 pt-16 pb-8" style={{ borderTop: '1px solid var(--ml-border)', zIndex: 10, position: 'relative' }}>
        <div className="max-w-6xl mx-auto">

          {/* Footer CTA */}
          <div className="mb-14 text-center">
            <h3 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 200, letterSpacing: '-.03em', lineHeight: 1.2, fontFamily: F, marginBottom: '.5rem' }}>
              {lang === 'es' ? '¿Listo para activar tu inventario?' : 'Ready to activate your inventory?'}
            </h3>
            <p style={{ fontSize: '.875rem', color: 'rgba(255,255,255,.38)', fontFamily: F, fontWeight: 300, marginBottom: '1.75rem' }}>
              {lang === 'es' ? 'Empieza tu prueba gratuita de 15 días hoy mismo.' : 'Start your 15-day free trial today.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/registro" className="pill-cta px-7 py-3 text-sm">
                {lang === 'es' ? 'Crear cuenta gratis' : 'Create free account'}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </Link>
              <a href="#contact" className="px-7 py-3 text-sm rounded-md transition-colors" style={{ border: '1px solid var(--ml-border)', color: 'var(--ml-fg)', fontFamily: F, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#fff'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.4)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.7)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,.18)' }}>
                {lang === 'es' ? 'Hablar con ventas' : 'Talk to sales'}
              </a>
            </div>
            {/* Apps coming soon */}
            <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.68rem', letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.28)', fontFamily: F, fontWeight: 500 }}>
                {lang === 'es' ? 'Próximamente en' : 'Coming soon to'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 9999, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.04)', fontSize: '.75rem', color: 'rgba(255,255,255,.6)', fontFamily: F }}>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="rgba(255,255,255,.6)"><path d="M9.9 7.4c0-1.6 1.3-2.4 1.4-2.4-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6C3.1 3.7 2 4.4 1.4 5.5c-1.2 2.1-.3 5.3.9 7 .6.8 1.3 1.8 2.2 1.7.9 0 1.2-.6 2.3-.6s1.4.6 2.3.6c1 0 1.6-.9 2.2-1.7.7-1 1-2 1-2-.1 0-2-.8-2-3.1zM8.3 2.6c.5-.6.8-1.4.7-2.2-.7 0-1.5.5-2 1-.4.5-.8 1.3-.7 2.1.8.1 1.5-.4 2-.9z"/></svg>
                App Store
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 9999, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.04)', fontSize: '.75rem', color: 'rgba(255,255,255,.6)', fontFamily: F }}>
                <svg width="12" height="13" viewBox="0 0 12 13" fill="none"><path d="M.8.9v11.2c0 .3.3.5.6.4l6.3-5.8L1.4.5C1.1.4.8.6.8.9z" fill="oklch(1 0 0 / 55%)"/><path d="M9.6 4.6L2.5.6l5.2 4.9 1.9-.9z" fill="oklch(1 0 0 / 70%)"/><path d="M9.6 8.4l-1.9-.9-5.2 4.9 7.1-4z" fill="oklch(1 0 0 / 40%)"/><path d="M11.3 6c.3.2.3.8 0 1l-1.7 1-2-1.5 2-1.5 1.7 1z" fill="oklch(1 0 0 / 70%)"/></svg>
                Google Play
              </span>
            </div>
          </div>

          {/* Footer grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,.055)' }}>
            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-center mb-3" aria-label="PropSync inicio">
                <Image src="/logo-lockup.png" alt="PropSync" width={140} height={36} style={{ width: 'auto', height: 36, display: 'block' }} />
              </Link>
              <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 300, lineHeight: 1.6, maxWidth: 240 }}>
                {t.footerTagline}
              </p>
            </div>

            {/* Producto */}
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>
                {lang === 'es' ? 'Producto' : 'Product'}
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><a href="#platform" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.platform}</a></li>
                <li><a href="#features" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.marketing}</a></li>
                <li><a href="#portales" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.portals}</a></li>
                <li><Link href="/demo" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>Demo</Link></li>
                <li><a href="#faq" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.faq}</a></li>
                <li><a href="#pricing" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.pricing}</a></li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>
                {lang === 'es' ? 'Empresa' : 'Company'}
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><a href="#contact" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.nav.contact}</a></li>
                <li><a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>Elevare</a></li>
              </ul>
            </div>

            {/* Cuenta */}
            <div>
              <p style={{ fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.32)', fontFamily: F, fontWeight: 600, marginBottom: '.85rem' }}>
                {lang === 'es' ? 'Cuenta' : 'Account'}
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                <li><Link href="/registro" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{t.cta}</Link></li>
                <li><Link href="/login" style={{ fontSize: '.82rem', color: 'rgba(255,255,255,.55)', fontFamily: F, fontWeight: 300, textDecoration: 'none' }}>{lang === 'es' ? 'Iniciar sesión' : 'Log in'}</Link></li>
              </ul>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="pt-7 flex flex-col md:flex-row items-center justify-between gap-3" style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.22)', fontFamily: F }}>
            <span>
              © {new Date().getFullYear()} PropSync · {lang === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
              {' · '}
              <Link href="/privacidad" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'none' }}>
                {lang === 'es' ? 'Privacidad' : 'Privacy'}
              </Link>
            </span>
            <span>{t.credit}{' '}
              <a href="https://elevarewebservices.com" target="_blank" rel="noopener noreferrer"
                 style={{ color: 'rgba(255,255,255,.55)', fontWeight: 500, letterSpacing: '.06em', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,.2)', paddingBottom: 1, transition: 'color .2s, border-color .2s' }}
                 onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.9)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.5)' }}
                 onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)' }}>
                Elevare
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
