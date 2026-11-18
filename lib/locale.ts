export type Locale = 'ar' | 'ckb' | 'en'

export const LOCALE_COOKIE = 'school_pulse_locale'
export const localeOptions: Locale[] = ['ar', 'ckb', 'en']

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && localeOptions.includes(value as Locale)
}

export function localeFromGeo(countryValue?: string | null, regionValue?: string | null, cityValue?: string | null): Locale {
  const country = countryValue?.trim().toUpperCase()
  if (country && country !== 'IQ') return 'ar'

  const region = (regionValue ?? '').trim().toUpperCase().split('-').pop() ?? ''
  let city = cityValue ?? ''
  try { city = decodeURIComponent(city) } catch { /* keep the original city */ }
  const normalizedCity = city.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const northernRegions = new Set(['AR', 'DA', 'SU', 'KR', 'KI', 'NI', 'HA', 'HL'])
  return northernRegions.has(region) || normalizedCity.includes('halabja') || normalizedCity.includes('helebce')
    ? 'ckb'
    : 'ar'
}

export const localeInfo: Record<Locale, { label: string; htmlLang: string; dir: 'rtl' | 'ltr' }> = {
  ar: { label: 'العربية', htmlLang: 'ar-IQ', dir: 'rtl' },
  ckb: { label: 'کوردی', htmlLang: 'ckb-IQ', dir: 'rtl' },
  en: { label: 'English', htmlLang: 'en', dir: 'ltr' },
}
