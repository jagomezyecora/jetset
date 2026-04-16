import en from './locales/en.json'
import es from './locales/es.json'

type Dict = { [k: string]: string }

const LOCALES: { [k: string]: Dict } = { en, es }
let current = (localStorage.getItem('lang') || 'en')
if (!LOCALES[current]) current = 'en'

export function setLocale(l: string) {
  if (LOCALES[l]) {
    current = l
    try { localStorage.setItem('lang', l) } catch (e) {}
  }
}

export function getLocale() { return current }

export function t(key: string) {
  return (LOCALES[current] && LOCALES[current][key]) || (LOCALES['en'] && LOCALES['en'][key]) || key
}

export default { t, setLocale, getLocale }
