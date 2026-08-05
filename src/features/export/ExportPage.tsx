import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LessonSlidePreview } from './LessonSlidePreview'
import { ExportSettingsPanel } from './ExportSettingsPanel'
import { DEFAULT_EXPORT_SETTINGS } from './export-settings'
import type { ExportSettings } from './export-settings'
import type { LessonSlideLineInput } from './lesson-slide'
import { useWorkspaceStore } from '../workspace/workspace-store'
import { exportToPptx } from './pptx-exporter'
import { buildPrintHtml } from './pdf-exporter'

export function ExportPage() {
  const { id } = useParams<{ id: string }>()
  const { data, loading, error, load } = useWorkspaceStore()
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_EXPORT_SETTINGS)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    if (id) load(id)
  }, [id, load])

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
              await exportToPptx({
                songTitle: data.songTitle,
                artist: data.artist,
                lines: slides.map(toLineInput),
                showTitle: settings.showTitle,
                showReading: settings.showReading,
                showConjugation: settings.showConjugation,
                showPageNumber: settings.showPageNumber,
              })
              alert('PPTX 已生成并保存到下载目录')
            } catch (e) {
              alert(String(e))
            }
          }}
          style={{ padding: '10px 20px' }}
        >
          导出 PPTX
        </button>
        <button
          onClick={() => {
            const html = buildPrintHtml({
              songTitle: data.songTitle,
              artist: data.artist,
              lines: slides.map(toLineInput),
              settings,
            })
            const win = window.open('', '_blank', 'width=900,height=1100')
            if (win) {
              win.document.write(html)
              win.document.close()
            } else {
              alert('浏览器拦截了弹窗，请允许弹出窗口后重试')
            }
          }}
          style={{ padding: '10px 20px' }}
        >
          导出 PDF（打印）
        </button>
        <span style={{ fontSize: 13, color: '#888' }}>
          PDF：在新窗口打印，选择「Microsoft Print to PDF」即可保存
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
      />

      {!line && <p style={{ color: '#888', marginTop: 16 }}>这首歌还没有分析结果。</p>}
    </div>
  )
}
