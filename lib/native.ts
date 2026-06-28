'use client'

// Bridge to detect whether the web app is running inside the Capacitor native
// shell (iOS/Android) vs a normal browser. Capacitor injects a global
// `window.Capacitor` at runtime, so we feature-detect it instead of importing
// @capacitor/core — that keeps the web build dependency-free and never breaks
// if the package isn't installed in this repo.

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
  Plugins?: Record<string, unknown>
  registerPlugin?: (name: string) => unknown
}

function cap(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null
}

// True only inside the iOS/Android Capacitor app.
export function isNativeApp(): boolean {
  const c = cap()
  return !!c?.isNativePlatform?.()
}

// 'ios' | 'android' | 'web'
export function getPlatform(): 'ios' | 'android' | 'web' {
  const c = cap()
  const p = c?.getPlatform?.() ?? 'web'
  return p === 'ios' || p === 'android' ? p : 'web'
}

// Access a native Capacitor plugin by name (e.g. 'Camera', 'PushNotifications').
// Returns null on web or if the plugin isn't available, so callers can fall back.
//
// In server.url mode the remote web app never imported the plugin's JS, so
// `Capacitor.Plugins[name]` is empty. We register the plugin on the fly with
// `Capacitor.registerPlugin(name)`, which the native bridge wires to the real
// native implementation — that's what makes the camera actually open.
export function getPlugin<T = unknown>(name: string): T | null {
  const c = cap()
  if (!c) return null

  const existing = c.Plugins?.[name]
  if (existing) return existing as T

  if (typeof c.registerPlugin === 'function') {
    try {
      return c.registerPlugin(name) as T
    } catch {
      return null
    }
  }

  return null
}
