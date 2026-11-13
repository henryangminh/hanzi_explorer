/** CC-CEDICT writes ü as "u:" — turn it (with any tone mark) into the proper character. */
export function formatUmlaut(s: string): string {
  return s
    .replace(/ū:/g, 'ǖ')
    .replace(/ú:/g, 'ǘ')
    .replace(/ǔ:/g, 'ǚ')
    .replace(/ù:/g, 'ǜ')
    .replace(/u:/g, 'ü')
}

/** Comparison key for pinyin across sources: drops separators (·./ spaces -) and case. */
export function normalizePinyin(p: string): string {
  return p.replace(/[·./\s-]+/g, '').toLowerCase()
}

/** Separable verbs (离合词) are shown split after the first syllable: "bāng máng" → "bāng//máng". */
export function formatSeparable(pinyin: string, isSeparable?: boolean): string {
  if (!isSeparable) return pinyin
  const spaceIdx = pinyin.indexOf(' ')
  return spaceIdx === -1 ? pinyin : pinyin.slice(0, spaceIdx) + '//' + pinyin.slice(spaceIdx + 1)
}

/**
 * 现代汉语词典 marks separable verbs with "//" inside the pinyin ("bāng//máng"); a leading
 * "//" marks a directional complement instead ("//·shàng"). Same rule as the dictionary pipeline.
 */
export function isSeparablePinyin(pinyin: string): boolean {
  return pinyin.includes('//') && !pinyin.trimStart().startsWith('//')
}
