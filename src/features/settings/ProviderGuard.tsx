import { useEffect, useState } from 'react'
import { useProviderStore } from './provider-store'
import { ProviderSetupModal } from './ProviderSetupModal'

/**
 * Global provider guard: shows the setup modal on first launch if no provider
 * has been saved. Used at the app root.
 */
export function ProviderGuard() {
  const loadActiveProvider = useProviderStore((s) => s.loadActiveProvider)
  const [checked, setChecked] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    loadActiveProvider().then(() => {
      setChecked(true)
      const id = useProviderStore.getState().providerId
      if (!id) setShow(true)
    })
  }, [loadActiveProvider])

  if (!checked) return null
  return show ? <ProviderSetupModal onClose={() => setShow(false)} required={false} /> : null
}
