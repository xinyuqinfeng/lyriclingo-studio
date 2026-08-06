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
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1>模型设置</h1>
      <p style={{ color: '#666' }}>
        填写任意 OpenAI 兼容 API 的 Base URL 与 Key。应用会自动读取模型列表；你的 Key
        只保存在本机系统凭据库，不会写入数据库或导出文件。
      </p>

      {lastError && (
        <div style={{ color: '#c00', background: '#fdd', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          {lastError}
        </div>
      )}
      {testResult && (
        <div style={{ color: '#060', background: '#dfd', padding: 8, borderRadius: 4, marginBottom: 12 }}>
          {testResult}
        </div>
      )}

      <label style={{ display: 'block', marginBottom: 12 }}>
        Base URL
        <input
          type="text"
          placeholder="https://api.openai.com/v1"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        API Key
        <input
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>

      <button
        onClick={testConnection}
        disabled={testing}
        style={{ padding: '8px 16px', marginRight: 8 }}
      >
        {testing ? '连接中…' : '测试连接并获取模型'}
      </button>
      <button onClick={clearLastError} style={{ padding: '8px 16px' }}>
        清除状态
      </button>

      {models.length > 0 && (
        <label style={{ display: 'block', marginTop: 16, marginBottom: 12 }}>
          模型
          <input
            type="text"
            list="model-options"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="选择或手动输入模型 ID"
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
          <datalist id="model-options">
            {models.map((m) => (
              <option key={m.id} value={m.id} />
            ))}
          </datalist>
        </label>
      )}

      <button onClick={saveProvider} style={{ padding: '10px 20px' }}>
        保存模型配置
      </button>
    </div>
  )
}
