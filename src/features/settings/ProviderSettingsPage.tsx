import { useEffect, useState } from 'react'
import { useProviderStore } from './provider-store'

export function ProviderSettingsPage() {
  const {
    providers,
    providerId,
    name,
    baseUrl,
    apiKey,
    model,
    models,
    testing,
    testResult,
    lastError,
    revealedKey,
    selectProvider,
    setProviderId,
    setName,
    setBaseUrl,
    setApiKey,
    setModel,
    testConnection,
    saveProvider,
    loadActiveProvider,
    loadProviders,
    revealKey,
    removeProvider,
    clearLastError,
  } = useProviderStore()
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    loadActiveProvider().then(() => loadProviders())
  }, [loadActiveProvider, loadProviders])

  const activeEntry = providers.find((p) => p.providerId === providerId)

  function handleNew() {
    setProviderId(null)
    setName('')
    setBaseUrl('')
    setApiKey('')
    setModel('')
    setShowKey(false)
  }

  return (
    <div className="page">
      <h1>模型设置</h1>
      <p className="page-sub">
        可配置多个 OpenAI 兼容供应商，下拉选择。Key 只保存在本机系统凭据库，不会写入数据库或导出文件。
      </p>

      <div className="glass-panel" style={{ padding: 24 }}>
        {lastError && <div className="notice notice-err">{lastError}</div>}
        {testResult && <div className="notice notice-ok">{testResult}</div>}

        {/* Provider selector */}
        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>供应商</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              className="input"
              style={{ flex: 1 }}
              value={providerId ?? ''}
              onChange={(e) => {
                const v = e.target.value
                if (v) {
                  selectProvider(v)
                  setShowKey(false)
                }
              }}
            >
              <option value="">— 选择已保存的供应商 —</option>
              {providers.map((p) => (
                <option key={p.providerId} value={p.providerId}>
                  {p.name || p.baseUrl}
                </option>
              ))}
            </select>
            <button className="btn btn-ghost" onClick={handleNew} style={{ padding: '5px 14px' }}>
              + 新增
            </button>
          </div>
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>名称（可选）</div>
          <input
            className="input"
            style={{ width: '100%' }}
            type="text"
            placeholder="如：我的供应商"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>Base URL</div>
          <input
            className="input"
            style={{ width: '100%' }}
            type="text"
            placeholder="https://api.example.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>API Key</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              type={showKey ? 'text' : 'password'}
              placeholder={providerId ? '输入新 Key 以更换（留空则保留原 Key）' : 'sk-...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            {providerId && (
              <button
                className="btn btn-ghost"
                style={{ padding: '5px 12px' }}
                title={showKey ? '隐藏 Key' : '显示 Key'}
                onClick={() => {
                  if (!showKey && !revealedKey) revealKey()
                  setShowKey(!showKey)
                }}
              >
                {showKey ? '🙈 隐藏' : '👁 查看'}
              </button>
            )}
          </div>
          {providerId && !showKey && activeEntry?.maskedKey && (
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              已保存 Key：{activeEntry.maskedKey}
            </div>
          )}
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={testConnection} disabled={testing}>
            {testing ? '连接中…' : '测试连接并获取模型'}
          </button>
          <button className="btn btn-ghost" onClick={clearLastError}>
            清除状态
          </button>
        </div>

        {models.length > 0 && (
          <label style={{ display: 'block', marginTop: 18, marginBottom: 14 }}>
            <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>模型</div>
            <input
              className="input"
              style={{ width: '100%' }}
              type="text"
              list="model-options"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="选择或手动输入模型 ID"
            />
            <datalist id="model-options">
              {models.map((m) => (
                <option key={m.id} value={m.id} />
              ))}
            </datalist>
          </label>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn" style={{ padding: '10px 20px' }} onClick={saveProvider}>
            {providerId ? '保存修改' : '保存新供应商'}
          </button>
          {providerId && (
            <button
              className="btn btn-danger"
              style={{ padding: '10px 20px' }}
              onClick={() => {
                if (confirm('删除该供应商及其保存的 Key？')) removeProvider(providerId)
              }}
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
