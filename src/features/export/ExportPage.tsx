import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { LessonSlidePreview } from './LessonSlidePreview'
import { ExportSettingsPanel } from './ExportSettingsPanel'
import { loadSavedSettings, persistSettings } from './export-settings'
import type { ExportSettings } from './export-settings'
import type { LessonSlideLineInput } from './lesson-slide'
import { useWorkspaceStore } from '../workspace/workspace-store'
import { exportToPptx } from './pptx-exporter'
import { buildPrintHtml } from './pdf-exporter'

function b64encode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
}

export function ExportPage() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error, load } = useWorkspaceStore()
  const [settings, setSettings] = useState<ExportSettings>(() => loadSavedSettings())
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    if (id) load(id)
  }, [id, load])

  useEffect(() => {
    persistSettings(settings)
  }, [settings])

  if (loading) return <p style={{ padding: 24 }}>加载中…</p>
  if (error) return <p style={{ padding: 24, color: '#c00' }}>{error}</p>
  if (!data) return <p style={{ padding: 24 }}>暂无数据</p>

  const slides = data.lines.filter((l) => !l.line.isSectionBreak && l.translation)
  const total = Math.max(slides.length, 1)
  const line = slides[currentPage]

  function toLineInput(l: (typeof slides)[number]): LessonSlideLineInput {
    return {
      seq: l.line.seq,
      text: l.line.text,
      isSectionBreak: false,
      readingText: l.readingText ?? undefined,
      translation: l.translation ?? '',
      grammarNotes: l.grammarNotes ?? undefined,
      tokens: l.tokens.map((t) => ({
        surface: t.surface,
        pos: t.pos,
        baseForm: t.baseForm,
        meaning: t.meaning,
        reading: t.reading ?? undefined,
        conjugation: t.conjugation ?? undefined,
        confirmed: t.confirmed,
        favorite: false,
      })),
    }
  }

  const lineInput: LessonSlideLineInput = line ? toLineInput(line) : { seq: 0, text: '', isSectionBreak: false, translation: '', tokens: [] }

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', padding: 24 }}>
      <h1>学习页预览</h1>
      <p style={{ color: '#666' }}>每句歌词一页，导出为 PPTX / PDF 前的预览。</p>

      <ExportSettingsPanel settings={settings} onChange={setSettings} />

      <div style={{ display: 'flex', gap: 12, margin: '12px 0', alignItems: 'center' }}>
        <button
          onClick={async () => {
            try {
              const { fileName, base64 } = await exportToPptx({
                songTitle: data.songTitle,
                artist: data.artist,
                lines: slides.map(toLineInput),
                showTitle: settings.showTitle,
                showReading: settings.showReading,
                showConjugation: settings.showConjugation,
                showPageNumber: settings.showPageNumber,
                background: settings.background,
              })
              const saved = await invoke<string | null>('save_export_file', {
                defaultName: fileName,
                contentB64: base64,
              })
              if (saved) alert(`PPTX 已保存到：${saved}`)
            } catch (e) {
              alert(String(e))
            }
          }}
          style={{ padding: '10px 20px' }}
        >
          导出 PPTX
        </button>
        <button
          onClick={async () => {
            try {
              const html = buildPrintHtml({
                songTitle: data.songTitle,
                artist: data.artist,
                lines: slides.map(toLineInput),
                settings,
              })
              const fileName = `${data.songTitle}-歌词学习.pdf`
              const saved = await invoke<string | null>('save_export_file', {
                defaultName: fileName,
                contentB64: b64encode(html),
              })
              if (saved) alert(`PDF 打印文件已保存到：${saved}\n\n用浏览器打开后选择打印→另存为 PDF 即可。`)
            } catch (e) {
              alert(String(e))
            }
          }}
          style={{ padding: '10px 20px' }}
        >
          导出 PDF
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          PDF：保存打印页后，用浏览器/Word 打开并「打印 → 另存为 PDF」。
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '12px 0' }}>
        <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>
          ‹ 上一句
        </button>
        <span>
          第 {currentPage + 1} / {total} 句
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(total - 1, currentPage + 1))}
          disabled={currentPage >= total - 1}
        >
          下一句 ›
        </button>
      </div>

      <LessonSlidePreview
        songTitle={data.songTitle}
        artist={data.artist}
        line={lineInput}
        pageNumber={currentPage + 1}
        totalPages={total}
        showTitle={settings.showTitle}
        showReading={settings.showReading}
        showConjugation={settings.showConjugation}
        showPageNumber={settings.showPageNumber}
        background={settings.background}
      />

      {!line && <p style={{ color: '#888', marginTop: 16 }}>这首歌还没有分析结果。</p>}
    </div>
  )
}
