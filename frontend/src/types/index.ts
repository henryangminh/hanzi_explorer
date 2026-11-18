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

export interface AdminUserUpdate {
  display_name?: string
  is_admin?: boolean
  is_active?: boolean
  new_password?: string
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
  /** Hán Việt per reading, keyed by diacritic pinyin */
  sino_vn_by_reading?: Record<string, string[]>
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
  /** Hán Việt per reading, keyed by diacritic pinyin */
  sino_vn_by_reading?: Record<string, string[]>
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
}

export interface RadicalChar {
  char: string
  pinyin: string
  meaning_en: string
  stroke_count?: number | null
}

export interface RadicalCharsResponse {
  radical: string
  chars: RadicalChar[]
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

export interface AddEntriesResult {
  added: string[]
  existing: string[]
  unknown: string[]
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

export type NotebookSortOrder =
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'created_at_desc'
  | 'created_at_asc'
  | 'name_asc'
  | 'name_desc'

// ── Flashcard ─────────────────────────────────────────────

export type FlashcardStatus = 'learned' | 'not_learned'

export interface FlashcardReading {
  pinyin: string
  sino_vn: string | null
}

export interface FlashcardEntry {
  char: string
  /** Every reading of the word with its Hán Việt, primary first */
  readings: FlashcardReading[]
  cedict_brief: string | null
  cvdict_brief: string | null
  status: FlashcardStatus | null
}

export type FlashcardStatusMap = Record<string, FlashcardStatus | null>

// ── Reader ────────────────────────────────────────────────

/** A piece of a pasted text: a dictionary word, or what lies between words (punctuation, Latin…). */
export interface ReaderToken {
  /** As written in the text */
  text: string
  /** Simplified dictionary word; null when not a word */
  word: string | null
  /** Reading in context, e.g. "yín háng" */
  pinyin: string | null
  status: FlashcardStatus | null
  /** HSK level per standard; 7 stands for 7-9. Missing when the word isn't in that list. */
  hsk: Partial<Record<HskStandard, number>>
}

/** HSK 2.0, HSK 3.0 (2021) and its newest revision */
export type HskStandard = 'old' | 'new' | 'newest'

// ── Search History ────────────────────────────────────────

export interface SearchHistoryItem {
  id: number
  char: string
  searched_at: string
}

export interface SearchHistoryListResponse {
  items: SearchHistoryItem[]
}

// ── Admin ─────────────────────────────────────────────────

export interface UserActivity {
  id: number
  username: string
  display_name: string
  /** Local YYYY-MM-DD dates, newest first */
  studied_dates: string[]
  learned_count: number
  not_learned_count: number
  review_due: number
}

export interface RecentSearch {
  display_name: string
  char: string
  searched_at: string
}

export interface AdminStats {
  total_users: number
  active_users: number
  deleted_users: number
  global_notebooks: number
  global_entries: number
  open_reports: number
  learners: UserActivity[]
  recent_searches: RecentSearch[]
}

// ── Word reports ──────────────────────────────────────────

export type WordReportStatus = 'open' | 'resolved'

export interface WordReport {
  id: number
  char: string
  message: string
  status: WordReportStatus
  reporter: string
  created_at: string
  resolved_at: string | null
}

// ── Admin data sources ────────────────────────────────────

export interface DefinitionSource {
  name: string
  version: string | null
  entry_count: number
  imported_at: string | null
  origin: string | null
}

export interface Dataset {
  key: string
  rows: number
  origin: string
}

export interface OnlineSource {
  source: string
  cached_words: number
  last_cached_at: string | null
}

export interface CrawlStatus {
  chars_done: number
  chars_total: number
  words_done: number
  words_total: number
  requests_24h: number
  budget_24h: number
  denials_24h: number
  denials_7d: number
  last_request_at: string | null
  eta_days: number
}

export interface DataSources {
  dictionary_built_at: string
  total_words: number
  definition_sources: DefinitionSource[]
  datasets: Dataset[]
  online_sources: OnlineSource[]
  crawler: CrawlStatus | null
}
