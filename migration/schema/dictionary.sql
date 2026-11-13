-- Schema of dictionary.db — the read-only reference dictionary.
--
-- This file is the single source of truth for the dictionary schema.
-- The backend only READS this database (attached as schema "dictionary", mode=ro);
-- it never creates or alters these tables. Keep backend/app/models/ in sync by hand.

CREATE TABLE IF NOT EXISTS dictionary_sources (
    id          INTEGER PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,   -- 'CC-CEDICT', 'CVDICT', '现代汉语词典'
    version     VARCHAR(50),
    entry_count INTEGER NOT NULL DEFAULT 0,
    imported_at VARCHAR
);

-- One row per unique simplified word/character.
CREATE TABLE IF NOT EXISTS characters (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    simplified               VARCHAR(10) NOT NULL UNIQUE,
    traditional              VARCHAR(10),
    radical                  VARCHAR(10),
    radical_traditional      VARCHAR(10),
    stroke_count             INTEGER,
    stroke_count_traditional INTEGER,
    frequency                INTEGER,                 -- rank, lower = more common
    is_separable             BOOLEAN NOT NULL DEFAULT 0,
    components               TEXT,                    -- JSON array
    components_traditional   TEXT                     -- JSON array
);
CREATE INDEX IF NOT EXISTS ix_characters_traditional ON characters (traditional);

-- One row per (character, reading); polyphones have several rows. Lowest id = primary reading.
CREATE TABLE IF NOT EXISTS pinyin_readings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id   INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    pinyin         VARCHAR(100) NOT NULL,             -- diacritic, e.g. 'zhōng'
    pinyin_numeric VARCHAR(100)                       -- numeric, e.g. 'zhong1' (NULL for XDHY-only readings)
);
CREATE INDEX IF NOT EXISTS ix_pinyin_readings_pinyin  ON pinyin_readings (pinyin);
CREATE INDEX IF NOT EXISTS ix_pinyin_readings_char_id ON pinyin_readings (character_id, id);

-- One row per meaning entry per source.
CREATE TABLE IF NOT EXISTS definitions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    source_id    INTEGER NOT NULL REFERENCES dictionary_sources (id),
    language     VARCHAR(5) NOT NULL,                 -- 'en' | 'vi' | 'zh'
    meaning_text TEXT NOT NULL                        -- XDHY ('zh') stores a JSON document
);
CREATE INDEX IF NOT EXISTS ix_definitions_char_src_lang ON definitions (character_id, source_id, language, id);

-- Hán Việt readings, one row per (character, numeric pinyin).
CREATE TABLE IF NOT EXISTS sino_vietnamese (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
    hanviet      VARCHAR(100) NOT NULL,               -- comma-separated
    pinyin       VARCHAR(20)                          -- numeric tone, e.g. 'shang4'
);
CREATE INDEX IF NOT EXISTS ix_sino_viet_char_pinyin ON sino_vietnamese (character_id, pinyin);

CREATE TABLE IF NOT EXISTS synonym_groups (
    id         INTEGER PRIMARY KEY,
    group_code VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS synonym_members (
    id       INTEGER PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES synonym_groups (id),
    word     VARCHAR(50) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_synonym_members_word     ON synonym_members (word);
CREATE INDEX IF NOT EXISTS ix_synonym_members_group_id ON synonym_members (group_id);

CREATE TABLE IF NOT EXISTS antonyms (
    id    INTEGER PRIMARY KEY,
    word1 VARCHAR(20) NOT NULL,
    word2 VARCHAR(20) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_antonyms_word1 ON antonyms (word1);
CREATE INDEX IF NOT EXISTS ix_antonyms_word2 ON antonyms (word2);

-- 214 Kangxi radicals.
CREATE TABLE IF NOT EXISTS radical_groups (
    id           INTEGER PRIMARY KEY,
    radical      VARCHAR(10) NOT NULL UNIQUE,         -- may hold variants, e.g. '人,亻'
    pinyin       VARCHAR(50) NOT NULL,
    meaning_en   VARCHAR NOT NULL,
    meaning_vi   VARCHAR,
    stroke_count INTEGER
);

-- Staging data used by the pipeline (not read by the backend).
CREATE TABLE IF NOT EXISTS hanzi_decomposition (
    id        INTEGER PRIMARY KEY,
    character VARCHAR(4) NOT NULL,
    component VARCHAR(4) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_hanzi_decomposition_character ON hanzi_decomposition (character);

-- HSK vocabulary (drkameleon/complete-hsk-vocabulary). Source of characters.frequency
-- and of the global HSK notebooks seeded into app.db.
CREATE TABLE IF NOT EXISTS hsk_words (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    simplified TEXT NOT NULL UNIQUE,
    radical    TEXT,
    frequency  INTEGER,
    pos        TEXT NOT NULL DEFAULT '[]',            -- JSON array
    levels     TEXT NOT NULL DEFAULT '[]'             -- JSON array, e.g. ["old-1","new-1","newest-1"]
);

CREATE TABLE IF NOT EXISTS hsk_forms (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id        INTEGER NOT NULL REFERENCES hsk_words (id) ON DELETE CASCADE,
    traditional    TEXT,
    pinyin         TEXT,
    pinyin_numeric TEXT,
    meanings       TEXT NOT NULL DEFAULT '[]',        -- JSON array
    classifiers    TEXT NOT NULL DEFAULT '[]'         -- JSON array
);
CREATE INDEX IF NOT EXISTS ix_hsk_forms_word_id ON hsk_forms (word_id);
