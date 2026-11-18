import { useTranslation } from 'react-i18next'
import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { NORMAL_RATE, SLOW_RATE, speakChinese } from '@/lib/speech'
import { useChineseVoice } from '@/hooks/useChineseVoice'

/** Hear the word at normal and slow speed; hidden when the browser has no Mandarin voice. */
export function SpeakButtons({ text, iconSize, buttonClass }: { text: string; iconSize: number; buttonClass: string }) {
  const { t } = useTranslation()
  const voice = useChineseVoice()
  if (!voice) return null

  return (
    <>
      <button onClick={() => speakChinese(text, voice, NORMAL_RATE)} className={cn(buttonClass, 'hover:text-[var(--color-primary)]')} title={t('dictionary.speak')}>
        <Volume2 size={iconSize} />
      </button>
      <button onClick={() => speakChinese(text, voice, SLOW_RATE)} className={cn(buttonClass, 'relative hover:text-[var(--color-primary)]')} title={t('dictionary.speakSlow')}>
        <Volume2 size={iconSize} />
        <span className="absolute -bottom-1 -right-1.5 px-0.5 rounded bg-[var(--color-bg-subtle)] text-[8px] font-semibold leading-none">
          x{SLOW_RATE}
        </span>
      </button>
    </>
  )
}
