import { useLanguage } from '../context/LanguageContext'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
]

export default function LanguageSwitcher() {
  const { lang, changeLang } = useLanguage()
  return (
    <div className="flex items-center bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-0.5 gap-0.5">
      {LANGS.map(({ code, label }) => (
        <button key={code} onClick={() => changeLang(code)}
          className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider transition-all duration-150
            ${lang === code
              ? 'bg-orange-500 text-black'
              : 'text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white'
            }`}>
          {label}
        </button>
      ))}
    </div>
  )
}