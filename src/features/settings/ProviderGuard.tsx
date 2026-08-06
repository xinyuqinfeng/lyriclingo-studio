import { useEffect, useState } from 'react'
import { useProviderStore } from './provider-store'
import { ProviderSetupModal } from './ProviderSetupModal'

/**
 * Global provider guard: shows the setup modal only when configuration is
 * incomplete (no provider saved, or the saved provider has no usable key).
 * Once a valid provider exists, the modal does not appear again.
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
  return show ? <ProviderSetupModal onClose={() => setShow(false)} required={true} /> : null
}
