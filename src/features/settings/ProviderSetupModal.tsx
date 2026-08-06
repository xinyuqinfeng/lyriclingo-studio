import { useState } from 'react'
import { useProviderStore } from './provider-store'
import { Modal, Notice, Spinner } from '../../components/ui'

/**
 * Modal shown on first launch (and before importing songs) to configure the
 * model provider. The user may cancel to browse, but importing requires config.
 */
export function ProviderSetupModal({
  onClose,
  required,
}: {
  onClose: () => void
  required: boolean
}) {
  const {
    baseUrl,
    apiKey,
    model,
    models,
    testing,
    testResult,
    lastError,
    setBaseUrl,
    setApiKey,
    setModel,
    testConnection,
    saveProvider,
  } = useProviderStore()
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await saveProvider()
    setSaving(false)
    // If save succeeded (testResult set), close the modal.
    const s = useProviderStore.getState()
    if (s.testResult && !s.lastError) {
      onClose()
    }
  }

  return (
    <Modal title="配置模型" onClose={required ? undefined : onClose}>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0, lineHeight: 1.6 }}>
        填写任意 OpenAI 兼容 API 的 Base URL、Key 与模型。你的 Key 只保存在本机系统凭据库，
        不会写入数据库或导出文件。
        {required && ' 配置后才能导入并分析歌曲。'}
      </p>

      {lastError && <Notice kind="err">{lastError}</Notice>}
      {testResult && <Notice kind="ok">{testResult}</Notice>}

      <label style={{ display: 'block', marginBottom: 14 }}>
        <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>Base URL</div>
        <input
          className="input"
          style={{ width: '100%' }}
          placeholder="https://api.example.com/v1"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>API Key</div>
        <input
          className="input"
          type="password"
          style={{ width: '100%' }}
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </label>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button className="btn" onClick={testConnection} disabled={testing}>
          {testing ? <Spinner label="连接中…" /> : '测试连接并获取模型'}
        </button>
      </div>

      {models.length > 0 && (
        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>模型</div>
          <input
            className="input"
            list="model-options"
            style={{ width: '100%' }}
            placeholder="选择或手动输入模型 ID"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <datalist id="model-options">
            {models.map((m) => (
              <option key={m.id} value={m.id} />
            ))}
          </datalist>
        </label>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        {!required && (
          <button className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
        )}
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存配置'}
        </button>
      </div>
    </Modal>
  )
}
