import { createContext, useContext, useState, useEffect } from 'react'
import translations from '../translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('alpha_lang') || 'en')

  const t = (key) => translations[lang][key] || key

  const isRTL = lang === 'ar'

  const changeLang = (newLang) => {
    setLang(newLang)
    localStorage.setItem('alpha_lang', newLang)
  }

  // Apply RTL direction to the entire document
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [lang, isRTL])

  return (
    <LanguageContext.Provider value={{ lang, t, isRTL, changeLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)