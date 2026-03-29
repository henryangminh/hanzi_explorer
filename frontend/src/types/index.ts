export interface User {
  id: number
  username: string
  display_name: string
  language: 'vi' | 'en'
  theme: 'light' | 'dark'
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// ── Dictionary ────────────────────────────────────────────

export interface CedictEntry {
  id: number
  simplified: string
  traditional: string | null
  pinyin: string
  meaning_en: string
  radical: string | null
  stroke_count: number | null
  hsk_level: number | null
  source_name: string
}

export interface ExternalSource {
  source: string
  label: string
  data: Record<string, unknown>
  from_cache: boolean
}

export interface UserNoteResponse {
  id: number
  char: string
  meaning_vi: string | null
  note: string | null
  tags: string[]
}

export interface DictionaryResponse {
  char: string
  cedict: CedictEntry[]
  external: ExternalSource[]
  user_note: UserNoteResponse | null
}

// ── Radicals ─────────────────────────────────────────────

export interface RadicalSummary {
  id: number
  radical: string
  pinyin: string
  meaning_en: string
  meaning_vi: string | null
  stroke_count: number | null
  compound_count: number
}

export interface CompoundItem {
  char: string
  pinyin: string
  meaning_en: string
  note: string | null
}

export interface RadicalDetail {
  id: number
  radical: string
  pinyin: string
  meaning_en: string
  meaning_vi: string | null
  stroke_count: number | null
  compounds: CompoundItem[]
}

// ── Settings ─────────────────────────────────────────────

export interface Settings {
  language: 'vi' | 'en'
  theme: 'light' | 'dark'
}
