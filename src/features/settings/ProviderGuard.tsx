import { useEffect, useState } from 'react'
import { useProviderStore } from './provider-store'
import { ProviderSetupModal } from './ProviderSetupModal'

/**
 * Global provider guard: shows the setup modal on launch unless a provider with
 * a usable API key is verified present. Re-checks whenever the app mounts.
 */
export function ProviderGuard() {
  const loadActiveProvider = useProviderStore((s) => s.loadActiveProvider)
  const [checked, setChecked] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    loadActiveProvider().then((active) => {
      setChecked(true)
      if (!active || !active.hasKey) setShow(true)
    })
  }, [loadActiveProvider])

  if (!checked) return null
  return show ? <ProviderSetupModal onClose={() => setShow(false)} required={false} /> : null
}
