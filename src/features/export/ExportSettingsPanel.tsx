import { useRef } from 'react'
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
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onChange({ ...settings, background: String(reader.result) })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '12px 0' }}>
      <Toggle label="标题" checked={settings.showTitle} onChange={(v) => onChange({ ...settings, showTitle: v })} />
      <Toggle label="读音" checked={settings.showReading} onChange={(v) => onChange({ ...settings, showReading: v })} />
      <Toggle label="活用" checked={settings.showConjugation} onChange={(v) => onChange({ ...settings, showConjugation: v })} />
      <Toggle label="页码" checked={settings.showPageNumber} onChange={(v) => onChange({ ...settings, showPageNumber: v })} />
      <Toggle label="词性" checked={settings.showPartOfSpeech} onChange={(v) => onChange({ ...settings, showPartOfSpeech: v })} />

      <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => fileRef.current?.click()}>
        {settings.background ? '更换背景' : '上传背景'}
      </button>
      {settings.background && (
        <button
          className="btn btn-ghost"
          style={{ padding: '5px 12px', fontSize: 13 }}
          onClick={() => onChange({ ...settings, background: undefined })}
        >
          清除背景
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>背景图自动等比铺满（cover）并居中，任意宽高比均可</span>
    </div>
  )
}
