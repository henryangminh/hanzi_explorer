/** Speaking Chinese with the browser's built-in text-to-speech (Web Speech API). */

/** The standard Mandarin voices of macOS/iOS, Chrome and Windows — preferred over novelty voices (Eddy, Grandpa, …). */
const PREFERRED_VOICES = ['Tingting', 'Google 普通话', 'Xiaoxiao', 'Huihui']

/**
 * A Mandarin voice: the preferred mainland ones in order (on-device before online, which can fail),
 * then any mainland, then Taiwan; Cantonese (zh-HK) is not Mandarin.
 */
export function findChineseVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null
  const voices = speechSynthesis.getVoices()
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase()
  const mainland = voices.filter((v) => lang(v) === 'zh-cn').sort((a, b) => Number(b.localService) - Number(a.localService))
  for (const name of PREFERRED_VOICES) {
    const voice = mainland.find((v) => v.name.includes(name))
    if (voice) return voice
  }
  return mainland[0] ?? voices.find((v) => lang(v) === 'zh-tw') ?? null
}

/** Kept referenced while speaking: Chrome may garbage-collect a playing utterance and cut it off. */
let current: SpeechSynthesisUtterance | null = null

/** Read `text` aloud, interrupting whatever is being read. */
export function speakChinese(text: string, voice: SpeechSynthesisVoice): void {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.onend = utterance.onerror = () => { if (current === utterance) current = null }
  current = utterance
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel()
  speechSynthesis.resume()  // Chrome can get stuck paused and then stays silent
  // Safari (and sometimes Chrome) drop an utterance queued in the same tick as cancel()
  setTimeout(() => speechSynthesis.speak(utterance), 50)
}
