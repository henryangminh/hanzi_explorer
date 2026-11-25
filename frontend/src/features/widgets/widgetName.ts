import i18n from '@/i18n'
import type { FlashcardWidgetConfig } from '@/store/flashcard.store'

/**
 * The name to show: the words-of-the-day widget keeps the name it was created with (in the language of
 * that moment), so while it is unchanged it follows the current language; a name the user typed stays.
 */
export function widgetName(widget: FlashcardWidgetConfig): string {
  const defaultNames = ['vi', 'en'].map((lng) => i18n.getFixedT(lng)('dashboard.wordsOfDay'))
  return widget.isDefault && defaultNames.includes(widget.name) ? i18n.t('dashboard.wordsOfDay') : widget.name
}
