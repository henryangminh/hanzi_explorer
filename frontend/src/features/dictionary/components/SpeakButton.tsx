import { useTranslation } from 'react-i18next'
import { Volume2 } from 'lucide-react'
import { speakChinese } from '@/lib/speech'
import { useChineseVoice } from '@/hooks/useChineseVoice'

/** Hear the word; hidden when the browser has no Mandarin voice. */
export function SpeakButton({ text, iconSize, buttonClass }: { text: string; iconSize: number; buttonClass: string }) {
  const { t } = useTranslation()
  const voice = useChineseVoice()
  if (!voice) return null

  return (
    <button onClick={() => speakChinese(text, voice)} className={buttonClass} title={t('dictionary.speak')}>
      <Volume2 size={iconSize} />
    </button>
  )
}
