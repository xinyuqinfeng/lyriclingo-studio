import { useEffect, useState } from 'react'
import { useProviderStore } from './provider-store'
import { ProviderSetupModal } from './ProviderSetupModal'

/**
 * Global provider guard: shows the setup modal on first launch if no provider
 * is configured, or if the saved provider has no usable API key.
 */
export function ProviderGuard() {
  const loadActiveProvider = useProviderStore((s) => s.loadActiveProvider)
  const [checked, setChecked] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    loadActiveProvider().then((active) => {
      setChecked(true)
      // Show if no provider, or if the provider is missing its API key.
      if (!active || !active.hasKey) setShow(true)
    })
  }, [loadActiveProvider])

  if (!checked) return null
  return show ? <ProviderSetupModal onClose={() => setShow(false)} required={false} /> : null
}
