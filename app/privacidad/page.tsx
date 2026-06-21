import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad — PropSync',
  description: 'Cómo PropSync recopila, usa y protege tu información.',
}

const UPDATED = '18 de junio de 2026'

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-foreground">
      <h1 className="text-3xl font-bold">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última actualización: {UPDATED}</p>

      <div className="prose prose-sm dark:prose-invert mt-8 space-y-6 max-w-none">
        <section>
          <p>
            PropSync es una plataforma de gestión inmobiliaria (inventario de propiedades, CRM y
            asistente de IA) operada por <strong>Elevare Web Services</strong>. Esta política
            explica qué datos recopilamos, cómo los usamos y con quién los compartimos. Aplica a
            la aplicación web y a las apps móviles de PropSync.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">1. Información que recopilamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cuenta:</strong> nombre, correo electrónico, nombre de la empresa y rol.</li>
            <li><strong>Datos de propiedades y clientes</strong> que tú ingresas (inventario, contactos, notas, fotos).</li>
            <li><strong>Imágenes</strong> que subes o capturas con la cámara para las fichas de propiedad.</li>
            <li><strong>Conversaciones con el asistente de IA.</strong></li>
            <li><strong>Datos técnicos:</strong> registros de uso, tipo de dispositivo y, si lo autorizas, identificadores para notificaciones push.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">2. Cómo usamos tu información</h2>
          <p>
            Usamos los datos para prestar el servicio, autenticarte, almacenar tu inventario y
            CRM, generar respuestas del asistente de IA, enviarte notificaciones que solicites y
            mejorar la plataforma. No vendemos tus datos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">3. Aislamiento entre empresas</h2>
          <p>
            PropSync es multi-empresa. Los datos de cada empresa están aislados: una empresa no
            puede acceder a la información de otra. El acceso se restringe por sesión y por
            políticas de seguridad a nivel de base de datos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">4. Proveedores que procesan datos</h2>
          <p>Trabajamos con proveedores que procesan datos por nuestra cuenta:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — base de datos y autenticación.</li>
            <li><strong>Cloudflare R2</strong> — almacenamiento de imágenes.</li>
            <li><strong>Anthropic (Claude)</strong> — procesa las consultas del asistente de IA. Anthropic no entrena sus modelos con estos datos.</li>
            <li><strong>Vercel</strong> — alojamiento de la aplicación.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">5. Permisos en la app móvil</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cámara y fotos:</strong> solo para que tomes o selecciones imágenes de propiedades. No accedemos a tu galería sin tu acción.</li>
            <li><strong>Notificaciones:</strong> solo si las activas, para avisarte de nuevos leads o seguimientos.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">6. Retención y seguridad</h2>
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Aplicamos cifrado en tránsito y
            en reposo. Puedes solicitar la eliminación de tu cuenta y tus datos escribiéndonos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">7. Tus derechos</h2>
          <p>
            Puedes acceder, corregir o eliminar tu información, y exportar tus datos. Para
            ejercer estos derechos, contáctanos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">8. Contacto</h2>
          <p>
            Elevare Web Services — <a href="mailto:gerencia@elevarewebservices.com" className="text-blue-600 hover:underline">gerencia@elevarewebservices.com</a>
            {' · '}
            <a href="https://elevarewebservices.com" className="text-blue-600 hover:underline">elevarewebservices.com</a>
          </p>
        </section>
      </div>
    </main>
  )
}
