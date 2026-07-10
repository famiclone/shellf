import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "uk";

const STORAGE_KEY = "shellf-locale";

const en = {
  "app.title": "Shellf — Video Game Catalog",
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.deleting": "Deleting...",
  "common.upload": "Upload",
  "common.add": "Add",
  "common.replace": "Replace",
  "common.download": "Download",
  "common.next": "Next",
  "common.skip": "Skip",
  "common.close": "Close",
  "common.notSpecified": "Not specified",
  "common.requestError": "Request failed",
  "common.gameNotFound": "Game not found",
  "common.platform": "Platform",

  "nav.home": "Home",
  "nav.platforms": "Platforms",
  "nav.addGame": "Add game",
  "nav.settings": "Settings",

  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.themeHint": "Choose a light or dark interface theme.",
  "settings.themeAria": "Interface theme",
  "settings.themeDark": "Dark",
  "settings.themeLight": "Light",
  "settings.language": "Language",
  "settings.languageHint": "Choose the interface language.",
  "settings.languageAria": "Interface language",
  "settings.langEn": "English",
  "settings.langUk": "Ukrainian",

  "dashboard.title": "Collection",
  "dashboard.subtitle": "Overview of your video game library",
  "dashboard.totalGames": "Total games",
  "dashboard.spent": "Spent",
  "dashboard.platforms": "Platforms",
  "dashboard.byPlatform": "By platform",
  "dashboard.gameOne": "{count} game",
  "dashboard.gameMany": "{count} games",

  "platforms.title": "Platforms",
  "platforms.subtitle": "Choose a platform to browse your collection",
  "platforms.gameMany": "{count} games",

  "platformGames.fallbackTitle": "Platform",
  "platformGames.inCollection": "{count} games in collection",
  "platformGames.empty": "No games on this platform yet",
  "platformGames.addGame": "Add game",

  "addGame.title": "Add game",
  "addGame.subtitle": "Digitize a new purchase into your collection",
  "addGame.step.platform": "Platform",
  "addGame.step.rom": "ROM",
  "addGame.step.media": "Media",
  "addGame.step.metadata": "Metadata",
  "addGame.titleLabel": "Game title",
  "addGame.platformLabel": "Platform",
  "addGame.selectPlatform": "Select platform",
  "addGame.creating": "Creating...",
  "addGame.romLabel": "ROM file (dump)",
  "addGame.boxLabel": "Box photo",
  "addGame.manualLabel": "Manual scan (PDF or image)",
  "addGame.uploading": "Uploading...",
  "addGame.region": "Region",
  "addGame.purchasePrice": "Purchase price",
  "addGame.condition": "Condition",
  "addGame.notes": "Notes",
  "addGame.notesPlaceholder":
    "Bought on Yahoo Auctions, box has some scratches...",
  "addGame.finish": "Finish",
  "addGame.errorTitlePlatform": "Enter a title and platform",

  "editGame.title": "Edit game",
  "editGame.titleLabel": "Game title",
  "editGame.platformLabel": "Platform",
  "editGame.region": "Region",
  "editGame.purchasePrice": "Purchase price",
  "editGame.marketPrice": "Market price (manual)",
  "editGame.condition": "Condition",
  "editGame.notes": "Notes",
  "editGame.genres": "Genres",
  "editGame.genresHint": "Toggle presets or add your own tags.",
  "editGame.genresAdd": "Add genre",
  "editGame.errorTitle": "Enter a game title",

  "game.noCover": "No cover",
  "game.info": "Info",
  "game.region": "Region",
  "game.condition": "Condition",
  "game.genres": "Genres",
  "game.boughtFor": "Bought for",
  "game.prices": "Prices",
  "game.marketPrice": "Market price (manual)",
  "game.description": "Description",
  "game.scraping": "Loading from ScreenScraper...",
  "game.manual": "Manual",
  "game.files": "Files",
  "game.play": "Play",
  "game.hideEmulator": "Hide emulator",
  "game.downloadRom": "Download ROM",
  "game.downloadPack": "Download Pack",
  "game.syncing": "Syncing...",
  "game.patches": "Patches (ROM hacks)",
  "game.addPatch": "Add patch",
  "game.select": "Select",
  "game.noPatches": "No patches. Upload an IPS or BPS file.",
  "game.patchSelected":
    "Selected patch #{id} — will be used for play and download",
  "game.saves": "Saves (SRAM)",
  "game.addSave": "Add save",
  "game.noSaves": "No saves. Upload an .srm or .sav file.",
  "game.saveSelected":
    "Selected save #{id} — will be loaded when you play",
  "game.emulator": "Emulator",

  "actions.edit": "Edit",
  "actions.editGame": "Edit game",
  "actions.deleteGame": "Delete game?",
  "actions.deleteGameBody":
    "Delete “{title}” permanently? ROM, images, patches, patch cache, saves (if any), and other files for this game will be removed. This cannot be undone.",

  "assets.files": "Files",
  "assets.confirmTitle": "Confirm deletion",
  "assets.deleteRom":
    "Delete ROM? Patched file cache will also be cleared.",
  "assets.deleteMedia": "Delete “{label}”?",
  "assets.deletePatch": "Delete patch “{label}”?",
  "assets.deleteSave": "Delete save “{label}”?",
  "assets.romMissing": "ROM not uploaded",
  "assets.screenscraper": "ScreenScraper",
  "assets.noFiles": "No files",
  "assets.noPatches": "No patches",
  "assets.noSaves": "No saves",
  "assets.patches": "Patches",
  "assets.saves": "Saves",
  "assets.addPatch": "Add patch",
  "assets.addSave": "Add save",

  "condition.sealed": "Sealed",
  "condition.cib": "Complete in box (CIB)",
  "condition.loose": "Loose",
  "condition.cart_only": "Cart only",
  "condition.manual_only": "Manual only",

  "media.box": "Box art",
  "media.manual": "Manual",
  "media.photo": "Photo",

  "region.JP": "Japan",
  "region.US": "USA",
  "region.EU": "Europe",
  "region.AU": "Australia",
  "region.KR": "Korea",
  "region.CN": "China",
  "region.OTHER": "Other",
} as const;

type MessageKey = keyof typeof en;
type Messages = Record<MessageKey, string>;

const uk: Messages = {
  "app.title": "Shellf — Каталог відеоігор",
  "common.loading": "Завантаження...",
  "common.save": "Зберегти",
  "common.saving": "Збереження...",
  "common.cancel": "Скасувати",
  "common.delete": "Видалити",
  "common.deleting": "Видалення...",
  "common.upload": "Завантажити",
  "common.add": "Додати",
  "common.replace": "Замінити",
  "common.download": "Завантажити",
  "common.next": "Далі",
  "common.skip": "Пропустити",
  "common.close": "Закрити",
  "common.notSpecified": "Не вказано",
  "common.requestError": "Помилка запиту",
  "common.gameNotFound": "Гру не знайдено",
  "common.platform": "Платформа",

  "nav.home": "Головна",
  "nav.platforms": "Платформи",
  "nav.addGame": "Додати гру",
  "nav.settings": "Налаштування",

  "settings.title": "Налаштування",
  "settings.theme": "Тема",
  "settings.themeHint": "Оберіть світлу або темну тему інтерфейсу.",
  "settings.themeAria": "Тема інтерфейсу",
  "settings.themeDark": "Темна",
  "settings.themeLight": "Світла",
  "settings.language": "Мова",
  "settings.languageHint": "Оберіть мову інтерфейсу.",
  "settings.languageAria": "Мова інтерфейсу",
  "settings.langEn": "English",
  "settings.langUk": "Українська",

  "dashboard.title": "Колекція",
  "dashboard.subtitle": "Огляд вашої бібліотеки відеоігор",
  "dashboard.totalGames": "Всього ігор",
  "dashboard.spent": "Витрачено",
  "dashboard.platforms": "Платформ",
  "dashboard.byPlatform": "По платформах",
  "dashboard.gameOne": "{count} гра",
  "dashboard.gameMany": "{count} ігор",

  "platforms.title": "Платформи",
  "platforms.subtitle": "Оберіть платформу для перегляду колекції",
  "platforms.gameMany": "{count} ігор",

  "platformGames.fallbackTitle": "Платформа",
  "platformGames.inCollection": "{count} ігор у колекції",
  "platformGames.empty": "Ще немає ігор на цій платформі",
  "platformGames.addGame": "Додати гру",

  "addGame.title": "Додати гру",
  "addGame.subtitle": "Оцифруйте нову покупку в колекцію",
  "addGame.step.platform": "Платформа",
  "addGame.step.rom": "ROM",
  "addGame.step.media": "Медіа",
  "addGame.step.metadata": "Метадані",
  "addGame.titleLabel": "Назва гри",
  "addGame.platformLabel": "Платформа",
  "addGame.selectPlatform": "Оберіть платформу",
  "addGame.creating": "Створення...",
  "addGame.romLabel": "ROM файл (дамп)",
  "addGame.boxLabel": "Фото боксу",
  "addGame.manualLabel": "Скан мануалу (PDF або зображення)",
  "addGame.uploading": "Завантаження...",
  "addGame.region": "Регіон",
  "addGame.purchasePrice": "Ціна покупки",
  "addGame.condition": "Стан",
  "addGame.notes": "Нотатки",
  "addGame.notesPlaceholder":
    "Куплено на Yahoo Auctions, є подряпини на коробці...",
  "addGame.finish": "Завершити",
  "addGame.errorTitlePlatform": "Вкажіть назву та платформу",

  "editGame.title": "Редагувати гру",
  "editGame.titleLabel": "Назва гри",
  "editGame.platformLabel": "Платформа",
  "editGame.region": "Регіон",
  "editGame.purchasePrice": "Ціна покупки",
  "editGame.marketPrice": "Ринкова ціна (ручна)",
  "editGame.condition": "Стан",
  "editGame.notes": "Нотатки",
  "editGame.genres": "Жанри",
  "editGame.genresHint": "Оберіть пресети або додайте свої теги.",
  "editGame.genresAdd": "Додати жанр",
  "editGame.errorTitle": "Вкажіть назву гри",

  "game.noCover": "Немає обкладинки",
  "game.info": "Інформація",
  "game.region": "Регіон",
  "game.condition": "Стан",
  "game.genres": "Жанри",
  "game.boughtFor": "Куплено за",
  "game.prices": "Ціни",
  "game.marketPrice": "Ринкова ціна (ручна)",
  "game.description": "Опис",
  "game.scraping": "Завантаження з ScreenScraper...",
  "game.manual": "Мануал",
  "game.files": "Файли",
  "game.play": "Грати",
  "game.hideEmulator": "Сховати емулятор",
  "game.downloadRom": "Завантажити ROM",
  "game.downloadPack": "Завантажити Pack",
  "game.syncing": "Синхронізація...",
  "game.patches": "Патчі (ROM hacks)",
  "game.addPatch": "Додати патч",
  "game.select": "Обрати",
  "game.noPatches": "Немає патчів. Завантажте IPS або BPS файл.",
  "game.patchSelected":
    "Обрано патч #{id} — буде використано для гри та завантаження",
  "game.saves": "Сейви (SRAM)",
  "game.addSave": "Додати сейв",
  "game.noSaves": "Немає сейвів. Завантажте файл .srm або .sav.",
  "game.saveSelected":
    "Обрано сейв #{id} — буде завантажено під час гри",
  "game.emulator": "Емулятор",

  "actions.edit": "Редагувати",
  "actions.editGame": "Редагувати гру",
  "actions.deleteGame": "Видалити гру?",
  "actions.deleteGameBody":
    "Видалити «{title}» назавжди? Будуть видалені ROM, зображення, патчі, кеш патчів, сейви (якщо є) та інші файли цієї гри. Цю дію не можна скасувати.",

  "assets.files": "Файли",
  "assets.confirmTitle": "Підтвердити видалення",
  "assets.deleteRom":
    "Видалити ROM? Кеш пропатчених файлів також буде очищено.",
  "assets.deleteMedia": "Видалити «{label}»?",
  "assets.deletePatch": "Видалити патч «{label}»?",
  "assets.deleteSave": "Видалити сейв «{label}»?",
  "assets.romMissing": "ROM не завантажено",
  "assets.screenscraper": "ScreenScraper",
  "assets.noFiles": "Немає файлів",
  "assets.noPatches": "Немає патчів",
  "assets.noSaves": "Немає сейвів",
  "assets.patches": "Патчі",
  "assets.saves": "Сейви",
  "assets.addPatch": "Додати патч",
  "assets.addSave": "Додати сейв",

  "condition.sealed": "Запечатана",
  "condition.cib": "Повний комплект (CIB)",
  "condition.loose": "Без коробки",
  "condition.cart_only": "Тільки картридж",
  "condition.manual_only": "Тільки мануал",

  "media.box": "Обкладинка",
  "media.manual": "Мануал",
  "media.photo": "Фото",

  "region.JP": "Японія",
  "region.US": "США",
  "region.EU": "Європа",
  "region.AU": "Австралія",
  "region.KR": "Корея",
  "region.CN": "Китай",
  "region.OTHER": "Інше",
};

const catalogs: Record<Locale, Messages> = { en, uk };

export type { MessageKey };

export function getStoredLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "uk" ? "uk" : "en";
  } catch {
    return "en";
  }
}

export function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.title = catalogs[locale]["app.title"];
}

function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text: string = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  numberLocale: string;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale());

  useEffect(() => {
    applyLocale(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore storage errors
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key: MessageKey, params?: Record<string, string | number>) =>
        translate(locale, key, params),
      numberLocale: locale === "uk" ? "uk-UA" : "en-US",
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used within LocaleProvider");
  return ctx;
}
