'use client'

import { useEffect } from 'react'
import { isNativeApp, getPlugin } from '@/lib/native'

interface SplashScreenPlugin {
  hide: (options?: { fadeOutDuration?: number }) => Promise<void>
}

/**
 * Dismisses the native splash screen as soon as the web app has actually
 * painted, instead of leaving it on a fixed timer.
 *
 * In `server.url` mode the webview loads propsyncia.com over the network, so the
 * old config (`launchAutoHide` with a flat 1200ms) hid the splash at a moment
 * unrelated to whether anything was ready — on a slow connection the user got a
 * blank webview, on a fast one they waited out the remainder of the 1200ms for
 * nothing. Hiding from here ties it to first paint in both directions.
 *
 * capacitor.config.json keeps auto-hide on with a longer ceiling as a safety
 * net: if the site never loads, this component never mounts, and the native
 * timer still uncovers the webview so the user sees the real error rather than
 * a splash frozen forever.
 *
 * No-ops on web — `getPlugin` returns null outside the native shell.
 */
export function NativeSplash() {
  useEffect(() => {
    if (!isNativeApp()) return

    const splash = getPlugin<SplashScreenPlugin>('SplashScreen')
    if (!splash?.hide) return

    // rAF twice: the first fires before the browser has committed this frame,
    // the second after it has painted. Hiding on the second avoids a flash of
    // unstyled/empty content between splash teardown and first paint.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        splash.hide({ fadeOutDuration: 200 }).catch(() => {
          /* already hidden by the native auto-hide timer — nothing to do */
        })
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [])

  return null
}
