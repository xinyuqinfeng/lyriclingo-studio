import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export interface ProviderModel {
  id: string
  ownedBy?: string | null
  created?: number | null
}

export interface ModelListResult {
  models: ProviderModel[]
  modelsPath: string
}

export interface ActiveProvider {
  providerId: string
  baseUrl: string
  model: string
}

const STORAGE_KEY = 'lyriclingo.activeProviderId'

interface ProviderState {
  baseUrl: string
  apiKey: string
  model: string
  models: ProviderModel[]
  testing: boolean
  testResult: string | null
  lastError: string | null
  providerId: string | null
  setBaseUrl: (v: string) => void
  setApiKey: (v: string) => void
  setModel: (v: string) => void
  testConnection: () => Promise<void>
  listModels: () => Promise<void>
  saveProvider: () => Promise<void>
  loadActiveProvider: () => Promise<ActiveProvider | null>
  clearLastError: () => void
}

export const useProviderStore = create<ProviderState>((set, get) => ({
  baseUrl: '',
  apiKey: '',
  model: '',
  models: [],
  testing: false,
  testResult: null,
  lastError: null,
  providerId: null,
  setBaseUrl: (v) => set({ baseUrl: v }),
  setApiKey: (v) => set({ apiKey: v }),
  setModel: (v) => set({ model: v }),
  clearLastError: () => set({ lastError: null, testResult: null }),

  testConnection: async () => {
    const { baseUrl, apiKey } = get()
    set({ testing: true, lastError: null, testResult: null })
    try {
      const result = await invoke<{ ok: boolean; modelsPath: string; modelCount: number; error: string | null }>(
        'test_connection',
        { baseUrl, apiKey },
      )
      if (result.ok) {
        set({
          testing: false,
          testResult: `连接成功（${result.modelsPath}，${result.modelCount} 个模型）`,
        })
        await get().listModels()
      } else {
        set({ testing: false, lastError: result.error ?? '连接失败' })
      }
    } catch (e) {
      set({ testing: false, lastError: String(e) })
    }
  },

  listModels: async () => {
    const { baseUrl, apiKey } = get()
    try {
      const result = await invoke<ModelListResult>('list_models', { baseUrl, apiKey })
      set({ models: result.models })
      if (result.models.length > 0 && !get().model) {
        set({ model: result.models[0].id })
      }
    } catch (e) {
      set({ lastError: String(e) })
    }
  },

  saveProvider: async () => {
    const { baseUrl, apiKey, model } = get()
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      set({ lastError: '请填写 Base URL、API Key 和模型' })
      return
    }
    try {
      const result = await invoke<{ providerId: string; credentialId: string }>('save_provider', {
        baseUrl,
        apiKey,
        model,
      })
      localStorage.setItem(STORAGE_KEY, result.providerId)
      set({ providerId: result.providerId, testResult: '已保存模型配置（Key 已存入系统凭据库）' })
    } catch (e) {
      set({ lastError: String(e) })
    }
  },

  loadActiveProvider: async () => {
    try {
      const active = await invoke<ActiveProvider | null>('get_active_provider')
      if (active) {
        localStorage.setItem(STORAGE_KEY, active.providerId)
        set({ baseUrl: active.baseUrl, model: active.model, providerId: active.providerId })
        return active
      }
      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) set({ providerId: savedId })
      return null
    } catch {
      return null
    }
  },
}))
