import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { SongLibraryPage } from './features/library/SongLibraryPage'
import { SongDetailPage } from './features/library/SongDetailPage'
import { LyricWorkspacePage } from './features/workspace/LyricWorkspacePage'
import { VocabularyPage } from './features/vocabulary/VocabularyPage'
import { ReviewPage } from './features/review/ReviewPage'
import { ExportPage } from './features/export/ExportPage'
import { ProviderSettingsPage } from './features/settings/ProviderSettingsPage'
import { DataSettingsPage } from './features/settings/DataSettingsPage'
import { ProviderGuard } from './features/settings/ProviderGuard'

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
        </header>
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
