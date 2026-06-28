'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { isNativeApp } from '@/lib/native'
import { CreditCard, MessageCircle, Check, Loader2, AlertCircle, LogOut, Tag, Clock } from 'lucide-react'
import type { SubscriptionStatus } from '@/lib/subscription'

// Set NEXT_PUBLIC_SUPPORT_WHATSAPP to your ACH/support number (E.164 digits, no +).
const SUPPORT_WA = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '50700000000'

interface Props {
  companyName: string
  status: SubscriptionStatus
  blocked: boolean
  daysLeft: number | null
  planNombre: string
  planPrecio: number
  paypalClientId: string | null
  paypalPlanId: string | null
}

export function SubscriptionPanel({ companyName, status, blocked, daysLeft, planNombre, planPrecio, paypalClientId, paypalPlanId }: Props) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const paypalRef = useRef<HTMLDivElement>(null)
  const native = typeof window !== 'undefined' && isNativeApp()
  const paypalReady = !native && !!paypalClientId && !!paypalPlanId

  // Load the PayPal SDK and render the subscription button when configured.
  useEffect(() => {
    if (!paypalReady) return
    const SCRIPT_ID = 'paypal-sdk'

    function renderButton() {
      const paypal = (window as any).paypal
      if (!paypal || !paypalRef.current) return
      paypalRef.current.innerHTML = ''
      paypal.Buttons({
        style: { layout: 'horizontal', color: 'blue', shape: 'pill', label: 'subscribe' },
        createSubscription: (_data: unknown, actions: any) =>
          actions.subscription.create({ plan_id: paypalPlanId }),
        onApprove: async (data: { subscriptionID?: string }) => {
          const res = await fetch('/api/subscription/paypal/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionID: data.subscriptionID }),
          })
          if (res.ok) {
            router.refresh()
          } else {
            const d = await res.json().catch(() => ({}))
            setPayError(d.error ?? 'No se pudo confirmar el pago')
          }
        },
        onError: () => setPayError('Ocurrió un error con PayPal. Intenta de nuevo.'),
      }).render(paypalRef.current)
    }

    if ((window as any).paypal) {
      renderButton()
      return
    }
    if (document.getElementById(SCRIPT_ID)) {
      document.getElementById(SCRIPT_ID)!.addEventListener('load', renderButton)
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&vault=true&intent=subscription`
    script.onload = renderButton
    document.body.appendChild(script)
  }, [paypalReady, paypalClientId, paypalPlanId, router])

  async function logout() {
    await createBrowserSupabaseClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function applyPromo(e: React.FormEvent) {
    e.preventDefault()
    setApplying(true)
    setPromoMsg(null)
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromoMsg({ ok: false, text: data.error ?? 'No se pudo aplicar el código' })
      } else {
        setPromoMsg({ ok: true, text: '¡Código aplicado! Actualizando…' })
        setTimeout(() => router.refresh(), 1200)
      }
    } catch {
      setPromoMsg({ ok: false, text: 'Error de conexión' })
    } finally {
      setApplying(false)
    }
  }

  const waHref = `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(
    `Hola, quiero pagar mi suscripción de PropSync (${companyName}) por ACH.`,
  )}`

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo-mark.png" alt="PropSync" width={32} height={32} style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span className="text-lg font-bold tracking-tight">PropSync</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </div>

        {/* Status */}
        <div className={`rounded-2xl border p-6 ${blocked ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20' : 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`h-5 w-5 ${blocked ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
            <h1 className="text-xl font-bold text-foreground">
              {blocked
                ? 'Tu acceso está pausado'
                : status === 'active'
                ? 'Suscripción activa'
                : `Prueba gratis — ${daysLeft ?? 0} ${daysLeft === 1 ? 'día' : 'días'} restantes`}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {blocked
              ? 'Tu período de prueba terminó. Activa tu suscripción para volver a usar PropSync. Tus datos están a salvo.'
              : status === 'active'
              ? 'Gracias por tu suscripción. Tienes acceso completo a PropSync.'
              : 'Disfruta PropSync gratis durante tu prueba. Activa tu plan cuando quieras para no perder el acceso.'}
          </p>
        </div>

        {/* Plan + pay */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tu plan</p>
              <p className="text-lg font-bold text-foreground">{planNombre}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">${planPrecio}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
          </div>

          {native ? (
            // App Store compliance: no external payment inside the iOS app.
            <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-muted-foreground">
              Para activar o gestionar tu suscripción, entra desde la web en{' '}
              <span className="font-semibold text-foreground">propsyncia.com</span> en tu navegador.
            </div>
          ) : (
            <>
              {/* PayPal subscription button (rendered by the SDK) — or a
                  placeholder until the PayPal env vars are configured. */}
              {paypalReady ? (
                <div ref={paypalRef} className="min-h-[45px]" />
              ) : (
                <Button className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white gap-2" disabled>
                  <CreditCard className="h-4 w-4" /> Pagar con PayPal (configurando…)
                </Button>
              )}
              {payError && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {payError}
                </div>
              )}

              {/* ACH via WhatsApp */}
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-md border border-green-600 text-green-700 dark:text-green-400 px-4 py-2.5 text-sm font-medium hover:bg-green-50 dark:hover:bg-green-950/30"
              >
                <MessageCircle className="h-4 w-4" /> Pagar por ACH (contáctanos por WhatsApp)
              </a>
              <p className="text-xs text-muted-foreground text-center">
                También aceptamos transferencia ACH — escríbenos por WhatsApp y te pasamos los datos.
              </p>
            </>
          )}
        </div>

        {/* Promo code */}
        {!native && (
          <form onSubmit={applyPromo} className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">¿Tienes un código promocional?</h2>
            </div>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO"
                className="font-mono uppercase"
              />
              <Button type="submit" disabled={applying || !code.trim()} variant="outline">
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
              </Button>
            </div>
            {promoMsg && (
              <div className={`flex items-start gap-2 text-xs ${promoMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {promoMsg.ok ? <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                {promoMsg.text}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
