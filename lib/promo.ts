import { createAdminClient } from './supabase'

export interface RedeemResult {
  ok: boolean
  error?: string
  applied?: { trialExtraDays: number; freeMonths: number; discountPercent: number }
}

/**
 * Validates and redeems a promo code for a company. Runs ONLY server-side with
 * the admin client — promo_codes has no client RLS policy, so codes can't be
 * enumerated or self-applied, and `uses` can't be tampered with. Idempotent per
 * company via the unique (promo_code_id, company_id) constraint.
 */
export async function redeemPromoCode(companyId: string, rawCode: string): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return { ok: false, error: 'Ingresa un código' }

  const db = createAdminClient()

  const { data: promo } = await (db.from('promo_codes') as any)
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (!promo || !promo.activo) return { ok: false, error: 'Código inválido' }
  if (promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now()) {
    return { ok: false, error: 'Este código ya expiró' }
  }
  if (promo.max_uses != null && promo.uses >= promo.max_uses) {
    return { ok: false, error: 'Este código alcanzó su límite de usos' }
  }

  // Record the redemption — the unique constraint blocks re-use by the same
  // company (and races). If it fails on conflict, they already used it.
  const { error: redeemErr } = await (db.from('promo_redemptions') as any)
    .insert({ promo_code_id: promo.id, company_id: companyId })
  if (redeemErr) return { ok: false, error: 'Ya usaste este código' }

  await (db.from('promo_codes') as any).update({ uses: promo.uses + 1 }).eq('id', promo.id)

  // Apply the effects that take place immediately.
  const updates: Record<string, unknown> = {}

  if (promo.trial_extra_days > 0) {
    const { data: company } = await (db.from('companies') as any)
      .select('trial_ends_at')
      .eq('id', companyId)
      .single()
    const base = company?.trial_ends_at ? new Date(company.trial_ends_at).getTime() : Date.now()
    const from = Math.max(base, Date.now())
    updates.trial_ends_at = new Date(from + promo.trial_extra_days * 24 * 60 * 60 * 1000).toISOString()
    updates.subscription_status = 'trialing'
  }

  if (promo.free_months > 0) {
    updates.subscription_status = 'active'
    updates.current_period_end = new Date(Date.now() + promo.free_months * 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  if (Object.keys(updates).length > 0) {
    await (db.from('companies') as any).update(updates).eq('id', companyId)
  }

  return {
    ok: true,
    applied: {
      trialExtraDays: promo.trial_extra_days,
      freeMonths: promo.free_months,
      discountPercent: promo.discount_percent,
    },
  }
}
