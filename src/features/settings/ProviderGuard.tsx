import { useEffect, useState } from 'react'
import { useProviderStore } from './provider-store'
import { ProviderSetupModal } from './ProviderSetupModal'

/**
 * Global provider guard: shows the setup modal once on every app launch.
 * - If no provider / no key: required config prompt (cannot dismiss).
 * - If a provider is saved: a lightweight confirmation the user can dismiss,
 *   allowing them to review or replace the config without being blocked.
 */
export function ProviderGuard() {
  const loadActiveProvider = useProviderStore((s) => s.loadActiveProvider)
  const providerId = useProviderStore((s) => s.providerId)
  const [checked, setChecked] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    loadActiveProvider().then(() => {
      setChecked(true)
      // Always prompt once per launch.
      setShow(true)
    })
  }, [loadActiveProvider])

  if (!checked) return null
  return show ? (
    <ProviderSetupModal onClose={() => setShow(false)} required={!providerId} />
  ) : null
}
