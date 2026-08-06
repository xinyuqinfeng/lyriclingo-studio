import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { SongLibraryPage } from './features/library/SongLibraryPage'
import { SongDetailPage } from './features/library/SongDetailPage'
import { LyricWorkspacePage } from './features/workspace/LyricWorkspacePage'
import { VocabularyPage } from './features/vocabulary/VocabularyPage'
import { ReviewPage } from './features/review/ReviewPage'
import { ExportPage } from './features/export/ExportPage'
import { ProviderSettingsPage } from './features/settings/ProviderSettingsPage'
import { DataSettingsPage } from './features/settings/DataSettingsPage'
import { ProviderGuard } from './features/settings/ProviderGuard'

const THEME_KEY = 'lyriclingo.theme'

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="切换深浅色主题"
      style={{
        marginLeft: 'auto',
        background: 'transparent',
        border: '1px solid var(--border-soft)',
        borderRadius: 8,
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
      }}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}

function Logo() {
  return (
    <div className="logo" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 16.5V7.5A2.5 2.5 0 0 1 6.5 5H17.5A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8 10h8M8 13.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <header className="topbar">
          <div className="nav-brand">
            <Logo />
            LyricLingo Studio
          </div>
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            歌曲库
          </NavLink>
          <NavLink to="/vocabulary" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            生词本
          </NavLink>
          <NavLink to="/review" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            复习
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            模型设置
          </NavLink>
          <NavLink to="/data" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            数据与隐私
          </NavLink>
          <ThemeToggle />
        </header>
        <div className="anim-stagger" style={{ flex: 1, overflowY: 'auto' }}>
          <ProviderGuard />
          <Routes>
            <Route path="/" element={<SongLibraryPage />} />
            <Route path="/song/:id" element={<SongDetailPage />} />
            <Route path="/workspace/:id" element={<LyricWorkspacePage />} />
            <Route path="/export/:id" element={<ExportPage />} />
            <Route path="/vocabulary" element={<VocabularyPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/settings" element={<ProviderSettingsPage />} />
            <Route path="/data" element={<DataSettingsPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
