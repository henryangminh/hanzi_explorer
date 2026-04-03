export interface User {
  id: number
  username: string
  display_name: string
  language: 'vi' | 'en'
  theme: 'light' | 'dark'
  is_admin: boolean
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

export interface CvdictEntry {
  id: number
  simplified: string
  traditional: string | null
  pinyin: string
  meaning_vi: string
  radical: string | null
  stroke_count: number | null
  hsk_level: number | null
  source_name: string
}

export interface DictLiteResponse {
  char: string
  cedict: CedictEntry[]
  cvdict: CvdictEntry[]
  sino_vn: string[]
}

export interface DictionaryResponse {
  char: string
  cedict: CedictEntry[]
  cvdict: CvdictEntry[]
  external: ExternalSource[]
  user_note: UserNoteResponse | null
  hsk_tags: string[]
  sino_vn: string[]
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

// ── Notebooks ─────────────────────────────────────────────

export interface NotebookResponse {
  id: number
  name: string
  description: string | null
  type: 'global' | 'private'
  owner_id: number | null
  entry_count: number
  created_at: string
  updated_at: string
}

export interface NotebookEntryResponse {
  id: number
  notebook_id: number
  char: string
  added_at: string
}

export interface NotebookEntryPreview {
  id: number
  char: string
  added_at: string
  pinyins: string[]
  sino_vn: string[]
  cedict_brief: string | null
  cvdict_brief: string | null
}

export interface NotebookDetail extends NotebookResponse {
  entries: NotebookEntryResponse[]
}

export type NotebookSortOrder =
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'created_at_desc'
  | 'created_at_asc'
  | 'name_asc'
  | 'name_desc'
