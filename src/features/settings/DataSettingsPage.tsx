import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface Stats {
  songs: number
  vocabulary: number
  reviews: number
}

export function DataSettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadStats() {
    try {
      const s = await invoke<Stats>('maintenance_stats')
      setStats(s)
    } catch (e) {
      setError(String(e))
    }
  }

  async function backup() {
    setError(null)
    setMessage(null)
    try {
      const r = await invoke<{ path: string; bytes: number }>('backup_database')
      setMessage(`已备份到：${r.path}（${(r.bytes / 1024).toFixed(1)} KB）`)
    } catch (e) {
      setError(String(e))
    }
  }

  async function deleteAll() {
    if (!confirm('确定要删除全部歌曲、分析、生词和复习数据？此操作不可撤销。')) return
    if (!confirm('再次确认：真的要清空所有学习数据吗？')) return
    setError(null)
    setMessage(null)
    try {
      await invoke('delete_all_data')
      setMessage('已删除全部学习数据')
      loadStats()
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1>数据与隐私</h1>

      <section style={{ marginBottom: 24 }}>
        <h3>数据统计</h3>
        <button onClick={loadStats}>刷新统计</button>
        {stats && (
          <ul>
            <li>歌曲：{stats.songs}</li>
            <li>生词：{stats.vocabulary}</li>
            <li>复习卡片：{stats.reviews}</li>
          </ul>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>备份与恢复</h3>
        <p style={{ color: '#666', fontSize: 13 }}>
          备份将复制本地数据库文件到应用数据目录（含时间戳）。
        </p>
        <button onClick={backup}>创建备份</button>
        <button onClick={() => invoke('open_data_dir')} style={{ marginLeft: 8 }}>
          打开数据目录
        </button>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>危险操作</h3>
        <button onClick={deleteAll} style={{ color: '#c00' }}>
          删除全部学习数据
        </button>
      </section>

      {message && <div style={{ color: '#060', background: '#dfd', padding: 8, borderRadius: 4 }}>{message}</div>}
      {error && <div style={{ color: '#c00', background: '#fdd', padding: 8, borderRadius: 4 }}>{error}</div>}

      <section style={{ marginTop: 24, background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
        <h3>隐私说明</h3>
        <ul style={{ fontSize: 13, lineHeight: 1.8, color: '#444' }}>
          <li>你输入的歌词会发送至你自己配置的模型供应商（你提供的 Base URL）进行翻译与分析。</li>
          <li>API Key 只保存在本机系统凭据库，不写入数据库、日志、备份或导出文件。</li>
          <li>应用不运营歌词库，不托管任何人的 API Key。</li>
          <li>所有歌曲、分析结果、生词与复习数据默认仅保存在本机。</li>
        </ul>
      </section>
    </div>
  )
}
