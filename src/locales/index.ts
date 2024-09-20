export const locales = ['de-DE', 'en', 'es', 'zh-CN', 'hi', 'id', 'tr-TR', 'zh-TW']

import { translation as deDE } from '../locales/en/common'
import { translation as en } from '../locales/en/common'
import { translation as es } from '../locales/es/common'
import { translation as zhCN } from '../locales/zh-CN/common'
import { translation as hi } from '../locales/hi/common'
import { translation as id } from '../locales/id/common'
import { translation as trTR } from '../locales/tr-TR/common'
import { translation as zhTW } from '../locales/zh-TW/common'

const localeStore = {
  deDE,
  en,
  es,
  zhCN,
  hi,
  id,
  trTR,
  zhTW
}

export const useTranslation = function() {

  function getLocale(locale) {
    return localeStore[locale]
  }

  function t(key, replacements = {}) {
    const locale = 'zh-CN'
    const translation = getLocale(locale)?.[key]
    if (!translation) {
      return key
    }
    return Object.keys(replacements).reduce((result, placeholder) => {
      return result.replace(`{{${placeholder}}}`, replacements[placeholder])
    }, translation)
  }

  return { t }
}