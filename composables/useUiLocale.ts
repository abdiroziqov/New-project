export type UiLocale = 'latn' | 'cyrl'

const exactTranslations: Record<string, string> = {
  Dashboard: 'Дашборд',
  Tarozi: 'Тарози',
  'Barter DB': 'Бартер ДБ',
  'Tez Kiritish': 'Тез Киритиш',
  'Kunlik Hisob': 'Кунлик Ҳисоб',
  'Tosh Kirimi': 'Тош Кирими',
  "Ta'minotchilar": 'Таъминотчилар',
  Ostatka: 'Остатка',
  Sotuvlar: 'Сотувлар',
  Qarzdorlar: 'Қарздорлар',
  Chiqimlar: 'Чиқимлар',
  Hisobotlar: 'Ҳисоботлар',
  Klientlar: 'Клиентлар',
  Korxona: 'Корхона',
  Menu: 'Меню',
  Chiqish: 'Чиқиш',
  "Qo'lda kiritish": 'Қўлда киритиш',
  "Qo'lda Kiritish": 'Қўлда Киритиш',
  "Pul Kiritish": 'Пул Киритиш',
  'Yuklab olish': 'Юклаб олиш',
  'CSV export': 'CSV экспорт',
  'JSON export': 'JSON экспорт',
  'Telegram yuborish': 'Телеграм юбориш',
  'Telegramdan olish': 'Телеграмдан олиш',
  'Yuborilmoqda...': 'Юборилмоқда...',
  'Yuklanmoqda...': 'Юкланмоқда...',
  'TG profil': 'TG профил',
  Copy: 'Копиялаш',
  Tanlash: 'Танлаш',
  Ulanmagan: 'Уланмаган',
  'Faqat admin yozuvlarni qo`shadi, tahrirlaydi va o`chiradi. Sizda faqat ko`rish ruxsati bor.':
    'Фақат админ ёзувларни қўшади, таҳрирлайди ва ўчиради. Сизда фақат кўриш рухсати бор.',
  Login: 'Логин',
  Parol: 'Парол',
  Kirish: 'Кириш',
  "Kirilmoqda...": 'Кирилмоқда...',
  Saqlash: 'Сақлаш',
  "Bekor qilish": 'Бекор қилиш',
  Tozalash: 'Тозалаш',
  Tahrirlash: 'Таҳрирлаш',
  "O'chirish": 'Ўчириш',
  "Joriy oy": 'Жорий ой',
  "Oxirgi 30 kun": 'Охирги 30 кун',
  "Oxirgi 7 kun": 'Охирги 7 кун',
  Hammasi: 'Ҳаммаси',
  "Filtrni tozalash": 'Филтрни тозалаш',
  Sana: 'Сана',
  "Boshlanish sanasi": 'Бошланиш санаси',
  "Tugash sanasi": 'Тугаш санаси',
  Zavod: 'Завод',
  Klient: 'Клиент',
  Mahsulot: 'Маҳсулот',
  "Mahsulot turi": 'Маҳсулот тури',
  "Yuk turi": 'Юк тури',
  "To`lov turi": 'Тўлов тури',
  "To'lov turi": 'Тўлов тури',
  Tonna: 'Тонна',
  "Jami summa": 'Жами сумма',
  "Jami narx": 'Жами нарх',
  "To'langan": 'Тўланган',
  "To'langan summa": 'Тўланган сумма',
  Balans: 'Баланс',
  Holat: 'Ҳолат',
  Amal: 'Амал',
  Izoh: 'Изоҳ',
  Telefon: 'Телефон',
  Manzil: 'Манзил',
  Qarz: 'Қарз',
  Foyda: 'Фойда',
  Tushum: 'Тушум',
  Tannarx: 'Таннарх',
  Chiqim: 'Чиқим',
  Naqd: 'Нақд',
  Click: 'Клик',
  Prichesleniya: 'Причисления',
  Qum: 'Қум',
  Mel: 'Мел',
  Qoplik: 'Қоплик',
  Rasipnoy: 'Расипной',
  Qisman: 'Қисман',
  Qarzdor: 'Қарздор',
  Avans: 'Аванс',
  "Har kun": 'Ҳар кун',
  "2 kunda bir": '2 кунда бир',
  Admin: 'Админ',
  Manager: 'Менежер',
  Operator: 'Оператор',
  admin: 'АДМИН',
  manager: 'МЕНЕЖЕР',
  operator: 'ОПЕРАТОР',
  Lotin: 'Лотин',
  Kirill: 'Кирилл',
  som: 'сўм',
  'Select an option': 'Танланг'
}

const apostrophePattern = /[ʻʼ`´‘’]/g
const digraphMap: Record<string, string> = {
  "o'": 'ў',
  "g'": 'ғ',
  sh: 'ш',
  ch: 'ч',
  ng: 'нг',
  ya: 'я',
  yu: 'ю',
  yo: 'ё',
  ts: 'ц'
}

const charMap: Record<string, string> = {
  a: 'а',
  b: 'б',
  c: 'с',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  h: 'ҳ',
  i: 'и',
  j: 'ж',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'қ',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'х',
  y: 'й',
  z: 'з'
}

const applyCase = (mapped: string, source: string) => {
  if (!source) {
    return mapped
  }

  if (source.toUpperCase() === source) {
    return mapped.toUpperCase()
  }

  if (source[0] === source[0].toUpperCase()) {
    return mapped[0].toUpperCase() + mapped.slice(1)
  }

  return mapped
}

const transliterateToCyrl = (input: string) => {
  const source = input.replace(apostrophePattern, "'")
  let result = ''
  let index = 0

  while (index < source.length) {
    const twoChars = source.slice(index, index + 2)
    const lowerTwoChars = twoChars.toLowerCase()

    if (digraphMap[lowerTwoChars]) {
      result += applyCase(digraphMap[lowerTwoChars], twoChars)
      index += 2
      continue
    }

    const char = source[index]
    const lowerChar = char.toLowerCase()

    if (charMap[lowerChar]) {
      result += applyCase(charMap[lowerChar], char)
      index += 1
      continue
    }

    if (char === "'") {
      index += 1
      continue
    }

    result += char
    index += 1
  }

  return result
}

export const useUiLocale = () => {
  const locale = useState<UiLocale>('ui:locale', () => 'latn')

  const t = (value: string) => {
    if (!value || locale.value === 'latn') {
      return value
    }

    if (exactTranslations[value]) {
      return exactTranslations[value]
    }

    return transliterateToCyrl(value)
  }

  const setLocale = (nextLocale: UiLocale) => {
    locale.value = nextLocale
  }

  const toggleLocale = () => {
    locale.value = locale.value === 'latn' ? 'cyrl' : 'latn'
  }

  const localeOptions = computed(() => [
    {
      value: 'latn' as UiLocale,
      label: locale.value === 'cyrl' ? 'Лотин' : 'Lotin'
    },
    {
      value: 'cyrl' as UiLocale,
      label: 'Кирилл'
    }
  ])

  return {
    locale,
    isCyrl: computed(() => locale.value === 'cyrl'),
    t,
    setLocale,
    toggleLocale,
    localeOptions
  }
}
