import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LessonSlidePreview } from './LessonSlidePreview'
import { ExportSettingsPanel } from './ExportSettingsPanel'
import { DEFAULT_EXPORT_SETTINGS } from './export-settings'
import type { ExportSettings } from './export-settings'
import type { LessonSlideLineInput } from './lesson-slide'
import { useWorkspaceStore } from '../workspace/workspace-store'

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

  const lineInput: LessonSlideLineInput = line
    ? {
        seq: line.line.seq,
        text: line.line.text,
        isSectionBreak: false,
        readingText: line.readingText ?? undefined,
        translation: line.translation ?? '',
        grammarNotes: line.grammarNotes ?? undefined,
        tokens: line.tokens.map((t) => ({
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
    : {
        seq: 0,
        text: '',
        isSectionBreak: false,
        translation: '',
        tokens: [],
      }

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', padding: 24 }}>
      <h1>学习页预览</h1>
      <p style={{ color: '#666' }}>每句歌词一页，导出为 PPTX / PDF 前的预览。</p>

      <ExportSettingsPanel settings={settings} onChange={setSettings} />

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
