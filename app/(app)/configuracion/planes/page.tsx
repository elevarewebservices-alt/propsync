import { PLANS } from '@/lib/plans'
import { getSessionPlan, getSessionPermissions } from '@/lib/auth'
import { RestrictedAccess } from '@/components/shared/RestrictedAccess'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

const planStyle: Record<string, { ring: string; bg: string; highlight: boolean }> = {
  starter: { ring: 'border-border', bg: 'bg-card', highlight: false },
  pro: { ring: 'border-blue-500 ring-2 ring-blue-500/20', bg: 'bg-card', highlight: true },
}

export default async function PlanesPage() {
  const permissions = await getSessionPermissions()
  if (!permissions.accessSettings) return <RestrictedAccess />

  const currentPlanId = await getSessionPlan()
  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Planes y precios</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Elige el plan que mejor se adapte a tu agencia inmobiliaria
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {PLANS.map((plan) => {
          const style = planStyle[plan.id]
          const isCurrent = plan.id === currentPlanId
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${style.ring} ${style.bg} p-6 flex flex-col`}
            >
              {style.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-3">Más popular</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                    Plan actual
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground">{plan.nombre}</h2>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">${plan.precio}</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Plan actual
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${style.highlight ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                    variant={style.highlight ? 'default' : 'outline'}
                  >
                    {plan.precio > (PLANS.find((p) => p.id === currentPlanId)?.precio ?? 0)
                      ? 'Actualizar'
                      : 'Cambiar plan'}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="max-w-4xl mx-auto rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/40">
          <h2 className="text-sm font-semibold text-foreground">Comparación detallada</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Característica</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {p.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Propiedades',
                  values: PLANS.map((p) =>
                    p.limites.propiedades === 'ilimitado' ? 'Ilimitadas' : `${p.limites.propiedades}`
                  ),
                },
                {
                  label: 'Canales de publicación',
                  values: PLANS.map((p) => p.limites.canales.length.toString()),
                },
                {
                  label: 'Módulo Mantener',
                  values: PLANS.map((p) => (p.limites.mantener ? '✓' : '✗')),
                },
                {
                  label: 'Campaña WhatsApp',
                  values: PLANS.map((p) => (p.limites.mantener ? '✓' : '✗')),
                },
                {
                  label: 'Soporte',
                  values: PLANS.map((p) =>
                    p.limites.soporte === 'comunidad'
                      ? 'Comunidad'
                      : p.limites.soporte === 'email'
                      ? 'Email'
                      : 'Dedicado 24/7'
                  ),
                },
              ].map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-foreground font-medium">{row.label}</td>
                  {row.values.map((val, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 text-center ${
                        val === '✓' ? 'text-green-600 dark:text-green-400' : val === '✗' ? 'text-muted-foreground/40' : 'text-foreground'
                      }`}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
