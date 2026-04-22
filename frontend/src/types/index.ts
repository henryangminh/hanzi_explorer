export interface User {
  id: number
  username: string
  display_name: string
  language: 'vi' | 'en'
  theme: 'light' | 'dark'
  is_admin: boolean
  is_active: boolean
  is_deleted: boolean
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
  is_separable: boolean
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
  title: string
  detail: string | null
  updated_at: string | null
  pinyin: string
  sino_vn: string[]
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
  is_separable: boolean
}

export interface XdhyDefItem {
  pos: string | null
  definition: string
  examples: string[]
  is_sub: boolean
}

export interface XdhyEntry {
  id: number
  simplified: string
  traditional: string | null
  pinyin: string
  defs: XdhyDefItem[]
  source_name: string
}

export interface WordInfo {
  word: string
  pinyin: string
  hanviet: string
}

export interface DictLiteResponse {
  char: string
  cedict: CedictEntry[]
  cvdict: CvdictEntry[]
  xdhy: XdhyEntry[]
  sino_vn: string[]
  hsk_tags: string[]
  synonyms: WordInfo[]
  antonyms: WordInfo[]
}

export interface HanzipyData {
  components: string[]
}

export interface DictionaryResponse {
  char: string
  cedict: CedictEntry[]
  cvdict: CvdictEntry[]
  xdhy: XdhyEntry[]
  external: ExternalSource[]
  user_notes: UserNoteResponse[]
  hsk_tags: string[]
  sino_vn: string[]
  hanzipy: HanzipyData | null
  synonyms: WordInfo[]
  antonyms: WordInfo[]
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
  learned_count: number
  not_learned_count: number
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
  traditional: string | null
  added_at: string
  pinyins: string[]
  sino_vn: string[]
  cedict_brief: string | null
  cvdict_brief: string | null
  is_separable: boolean
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

// ── Flashcard ─────────────────────────────────────────────

export interface FlashcardEntry {
  char: string
  pinyins: string[]
  cedict_brief: string | null
  cvdict_brief: string | null
  status: 'learned' | 'not_learned' | null
}

// ── Search History ────────────────────────────────────────

export interface SearchHistoryItem {
  id: number
  char: string
  searched_at: string
}

export interface SearchHistoryListResponse {
  items: SearchHistoryItem[]
}
