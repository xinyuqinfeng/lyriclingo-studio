import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { SongLibraryPage } from './features/library/SongLibraryPage'
import { SongDetailPage } from './features/library/SongDetailPage'
import { ProviderSettingsPage } from './features/settings/ProviderSettingsPage'

function App() {
  return (
    <BrowserRouter>
      <div>
        <header
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <strong>LyricLingo Studio</strong>
          <Link to="/">歌曲库</Link>
          <Link to="/settings">模型设置</Link>
        </header>
        <Routes>
          <Route path="/" element={<SongLibraryPage />} />
          <Route path="/song/:id" element={<SongDetailPage />} />
          <Route path="/settings" element={<ProviderSettingsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
