'use client'

import { useEffect, useState } from 'react'

// Returns whether the company has the active Marketing add-on. null while
// loading. Used to hide the Mantener module from navigation for companies that
// haven't contracted it (the pages are still gated server-side regardless).
export function useMarketingAddon(): boolean | null {
  const [hasAddon, setHasAddon] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHasAddon(!!d?.hasMarketingAddon))
      .catch(() => setHasAddon(false))
  }, [])

  return hasAddon
}
