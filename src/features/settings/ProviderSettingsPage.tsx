import { useEffect } from 'react'
import { useProviderStore } from './provider-store'

export function ProviderSettingsPage() {
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
    clearLastError,
    loadActiveProvider,
  } = useProviderStore()

  useEffect(() => {
    loadActiveProvider()
  }, [loadActiveProvider])

  return (
    <div className="page">
      <h1>模型设置</h1>
      <p className="page-sub">
        填写任意 OpenAI 兼容 API 的 Base URL 与 Key。应用会自动读取模型列表；你的 Key
        只保存在本机系统凭据库，不会写入数据库或导出文件。
      </p>

      <div className="glass-panel" style={{ padding: 24 }}>
        {lastError && <div className="notice notice-err">{lastError}</div>}
        {testResult && <div className="notice notice-ok">{testResult}</div>}

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>Base URL</div>
          <input
            className="input"
            style={{ width: '100%' }}
            type="text"
            placeholder="https://api.deepseek.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ marginBottom: 6, color: 'var(--text-secondary)', fontSize: 13 }}>API Key</div>
          <input
            className="input"
            style={{ width: '100%' }}
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
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

        <button className="btn" style={{ padding: '10px 20px' }} onClick={saveProvider}>
          保存模型配置
        </button>
      </div>
    </div>
  )
}
