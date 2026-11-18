/** Speaking Chinese with the browser's built-in text-to-speech (Web Speech API). */

export const NORMAL_RATE = 1
export const SLOW_RATE = 0.6

/** The standard Mandarin voices of macOS/iOS, Chrome and Windows — preferred over novelty voices (Eddy, Grandpa, …). */
const PREFERRED_VOICES = ['Tingting', 'Google 普通话', 'Xiaoxiao', 'Huihui']

/** A Mandarin voice: a standard mainland one first, then any mainland, then Taiwan; Cantonese (zh-HK) is not Mandarin. */
export function findChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase()
  const mainland = voices.filter((v) => lang(v) === 'zh-cn')
  return mainland.find((v) => PREFERRED_VOICES.some((name) => v.name.includes(name)))
    ?? mainland[0] ?? voices.find((v) => lang(v) === 'zh-tw') ?? null
}

/** Read `text` aloud, interrupting whatever is being read. */
export function speakChinese(text: string, voice: SpeechSynthesisVoice, rate: number): void {
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = rate
  speechSynthesis.speak(utterance)
}
