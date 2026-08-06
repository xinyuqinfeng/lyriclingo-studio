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
  hasKey: boolean
}

export interface ProviderListEntry {
  providerId: string
  name: string
  baseUrl: string
  model: string
  maskedKey: string
  hasKey: boolean
}

const STORAGE_KEY = 'lyriclingo.activeProviderId'

interface ProviderState {
  providers: ProviderListEntry[]
  providerId: string | null
  name: string
  baseUrl: string
  apiKey: string
  model: string
  models: ProviderModel[]
  testing: boolean
  testResult: string | null
  lastError: string | null
  revealedKey: string | null
  selectProvider: (id: string | null) => void
  setProviderId: (id: string | null) => void
  setName: (v: string) => void
  setBaseUrl: (v: string) => void
  setApiKey: (v: string) => void
  setModel: (v: string) => void
  loadKeyIfNeeded: () => Promise<void>
  testConnection: () => Promise<void>
  listModels: () => Promise<void>
  saveProvider: () => Promise<void>
  loadProviders: () => Promise<void>
  loadActiveProvider: () => Promise<ActiveProvider | null>
  revealKey: () => Promise<void>
  removeProvider: (id: string) => Promise<void>
  clearLastError: () => void
}

export const useProviderStore = create<ProviderState>((set, get) => ({
  providers: [],
  providerId: null,
  name: '',
  baseUrl: '',
  apiKey: '',
  model: '',
  models: [],
  testing: false,
  testResult: null,
  lastError: null,
  revealedKey: null,
  setProviderId: (id) => set({ providerId: id }),
  setName: (v) => set({ name: v }),
  setBaseUrl: (v) => set({ baseUrl: v }),
  setApiKey: (v) => set({ apiKey: v }),
  setModel: (v) => set({ model: v }),
  clearLastError: () => set({ lastError: null, testResult: null, revealedKey: null }),

  // Loads the saved key from the OS credential store when needed (e.g. a
  // selected provider whose key field was left blank on the form).
  loadKeyIfNeeded: async () => {
    const { apiKey, providerId } = get()
    if (apiKey.trim() || !providerId) return
    try {
      const key = await invoke<string>('get_provider_key', { providerId })
      set({ apiKey: key })
    } catch {
      // ignore; testConnection will surface the real error
    }
  },

  selectProvider: (id) => {
    if (!id) {
      set({ providerId: null, name: '', baseUrl: '', apiKey: '', model: '', models: [], revealedKey: null })
      return
    }
    const p = get().providers.find((x) => x.providerId === id)
    if (p) {
      localStorage.setItem(STORAGE_KEY, p.providerId)
      set({ providerId: p.providerId, name: p.name, baseUrl: p.baseUrl, model: p.model, apiKey: '', revealedKey: null })
    }
  },

  testConnection: async () => {
    await get().loadKeyIfNeeded()
    const { baseUrl, apiKey } = get()
    set({ testing: true, lastError: null, testResult: null })
    try {
      const result = await invoke<{ ok: boolean; modelsPath: string; modelCount: number; error: string | null }>(
        'test_connection',
        { baseUrl, apiKey },
      )
      if (result.ok) {
        set({ testing: false, testResult: `连接成功（${result.modelsPath}，${result.modelCount} 个模型）` })
        await get().listModels()
      } else {
        set({ testing: false, lastError: result.error ?? '连接失败' })
      }
    } catch (e) {
      set({ testing: false, lastError: String(e) })
    }
  },

  listModels: async () => {
    await get().loadKeyIfNeeded()
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
    const { baseUrl, apiKey, model, providerId, name } = get()
    if (!baseUrl.trim() || !model.trim()) {
      set({ lastError: '请填写 Base URL 和模型' })
      return
    }
    if (!apiKey.trim() && !providerId) {
      set({ lastError: '请填写 API Key（新供应商必须填写）' })
      return
    }
    try {
      const result = await invoke<{ providerId: string; credentialId: string }>('save_provider', {
        baseUrl,
        apiKey,
        model,
        name: name || '供应商',
        providerId,
      })
      localStorage.setItem(STORAGE_KEY, result.providerId)
      set({ providerId: result.providerId, testResult: '已保存供应商配置（Key 已存入系统凭据库）' })
      await get().loadProviders()
    } catch (e) {
      set({ lastError: String(e) })
    }
  },

  loadProviders: async () => {
    try {
      const providers = await invoke<ProviderListEntry[]>('list_providers')
      set({ providers })
    } catch (e) {
      set({ lastError: String(e) })
    }
  },

  loadActiveProvider: async () => {
    try {
      const active = await invoke<ActiveProvider | null>('get_active_provider')
      if (active) {
        localStorage.setItem(STORAGE_KEY, active.providerId)
        set({ providerId: active.providerId, baseUrl: active.baseUrl, model: active.model })
        await get().loadProviders()
        return active
      }
      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) set({ providerId: savedId })
      await get().loadProviders()
      return null
    } catch (e) {
      set({ lastError: '无法读取已保存的模型配置' })
      return null
    }
  },

  revealKey: async () => {
    const { providerId } = get()
    if (!providerId) return
    try {
      const key = await invoke<string>('get_provider_key', { providerId })
      set({ revealedKey: key, apiKey: key })
    } catch (e) {
      set({ lastError: String(e) })
    }
  },

  removeProvider: async (id: string) => {
    try {
      await invoke('remove_provider_key', { providerId: id })
      if (get().providerId === id) {
        set({ providerId: null, name: '', baseUrl: '', apiKey: '', model: '', revealedKey: null })
        localStorage.removeItem(STORAGE_KEY)
      }
      await get().loadProviders()
    } catch (e) {
      set({ lastError: String(e) })
    }
  },
}))
