import { ExportSettings } from './export-settings'

interface Props {
  settings: ExportSettings
  onChange: (s: ExportSettings) => void
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16, fontSize: 14 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function ExportSettingsPanel({ settings, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '12px 0' }}>
      <Toggle label="标题" checked={settings.showTitle} onChange={(v) => onChange({ ...settings, showTitle: v })} />
      <Toggle label="读音" checked={settings.showReading} onChange={(v) => onChange({ ...settings, showReading: v })} />
      <Toggle label="活用" checked={settings.showConjugation} onChange={(v) => onChange({ ...settings, showConjugation: v })} />
      <Toggle label="页码" checked={settings.showPageNumber} onChange={(v) => onChange({ ...settings, showPageNumber: v })} />
      <Toggle label="词性" checked={settings.showPartOfSpeech} onChange={(v) => onChange({ ...settings, showPartOfSpeech: v })} />
    </div>
  )
}
