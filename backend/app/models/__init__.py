# Models are split by database:
#   dictionary.db (read-only, schema "dictionary"): character, radical, sino_vn, synonym_antonym
#   app.db (read/write, main schema):               user, note, notebook, search_history, wotd, cache
DICTIONARY_SCHEMA = "dictionary"
