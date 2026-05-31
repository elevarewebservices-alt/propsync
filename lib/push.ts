import { createAdminClient } from '@/lib/supabase'
import webpush from 'web-push'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'admin@propsync.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendPushToCompany(companyId: string, payload: PushPayload) {
  const db = createAdminClient()
  const { data: subs } = await (db.from('push_subscriptions') as any)
    .select('endpoint, p256dh, auth')
    .eq('company_id', companyId)

  if (!subs?.length) return { sent: 0, failed: 0 }

  const results = await Promise.allSettled(
    subs.map((sub: any) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  const expiredEndpoints: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = (r as PromiseRejectedResult).reason
      if (err?.statusCode === 410) expiredEndpoints.push(subs[i].endpoint)
    }
  })
  if (expiredEndpoints.length) {
    for (const ep of expiredEndpoints) {
      await (db.from('push_subscriptions') as any).delete().eq('endpoint', ep)
    }
  }

  return { sent, failed }
}
