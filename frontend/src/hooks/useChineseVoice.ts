import { useEffect, useState } from 'react'
import { findChineseVoice } from '@/lib/speech'

/** The browser's Mandarin voice, or null when it has none (voices may load after the page). */
export function useChineseVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(findChineseVoice)

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const update = () => setVoice(findChineseVoice())
    speechSynthesis.addEventListener('voiceschanged', update)
    return () => speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  return voice
}
