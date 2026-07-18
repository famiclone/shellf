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
  "app.title": "Shellf — Collection Catalog",
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
  "common.gameNotFound": "Item not found",
  "common.platform": "Group",
  "common.kind": "Kind",

  "nav.home": "Home",
  "nav.platforms": "Groups",
  "nav.items": "Collection",
  "nav.addGame": "Add item",
  "nav.settings": "Settings",

  "settings.title": "Settings",
  "settings.section.general": "General",
  "settings.section.scraper": "Scraper",
  "settings.section.emulator": "Emulator config",
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
  "settings.scraperHint":
    "ScreenScraper developer credentials used to look up games by ROM hash. Softname must match the software name registered with your ScreenScraper developer account. Stored in the database (env vars still work as fallback).",
  "settings.scraperSoftname": "Softname",
  "settings.scraperDevId": "Developer ID",
  "settings.scraperDevPassword": "Developer password",
  "settings.scraperPasswordConfigured": "Saved — enter a new password to replace",
  "settings.emulatorHint":
    "JSON overrides merged over public/emulator/config. Use keys like \"_defaults\" or a core name (\"nes\", \"snes\").",
  "settings.emulatorJson": "Emulator overrides (JSON)",
  "settings.emulatorInvalidJson": "Invalid JSON object",

  "dashboard.title": "Collection",
  "dashboard.subtitle": "Overview of your collection",
  "dashboard.totalGames": "Total items",
  "dashboard.spent": "Spent",
  "dashboard.marketValue": "Market value",
  "dashboard.platforms": "Groups",
  "dashboard.byPlatform": "By group",
  "dashboard.gameOne": "{count} item",
  "dashboard.gameMany": "{count} items",

  "platforms.title": "Groups",
  "platforms.subtitle": "Choose a group to browse your collection",
  "platforms.gameMany": "{count} items",
  "platforms.empty": "No groups yet",
  "platforms.create": "New group",
  "platforms.createName": "Group name",
  "platforms.createNamePlaceholder": "Nintendo Entertainment System",
  "platforms.createEmulatorCore": "Emulator core (optional)",
  "platforms.createKind": "Type",
  "platforms.createKindRequired": "Select a type…",
  "platforms.createSubmit": "Create group",
  "platforms.createErrorName": "Enter a group name",
  "platforms.createErrorKind": "Select a type (Game, Audio, Video, Card, or Book)",

  "platformGames.fallbackTitle": "Group",
  "platformGames.inCollection": "{count} items in collection",
  "platformGames.empty": "No items in this group yet",
  "platformGames.addGame": "Add item",
  "platformGames.edit": "Edit group",

  "items.title": "Collection",
  "items.subtitle": "{count} items",
  "items.allTags": "All",
  "items.createTag": "New tag name",
  "items.empty": "No items yet",
  "items.emptyTag": "No items with this tag",

  "addGame.title": "Add item",
  "addGame.subtitle": "Add a new piece to your collection",
  "addGame.step.platform": "Group",
  "addGame.step.rom": "ROM",
  "addGame.step.media": "Media",
  "addGame.step.metadata": "Metadata",
  "addGame.titleLabel": "Title",
  "addGame.platformLabel": "Group",
  "addGame.selectPlatform": "Select group",
  "addGame.creating": "Creating...",
  "addGame.romLabel": "ROM file (dump)",
  "addGame.boxLabel": "Box photo",
  "addGame.manualLabel": "Manual scan (PDF or image)",
  "addGame.uploading": "Uploading...",
  "addGame.region": "Region",
  "addGame.purchasePrice": "Purchase price",
  "addGame.condition": "Condition",
  "addGame.isPirate": "Pirate / bootleg copy",
  "addGame.notes": "Notes",
  "addGame.notesPlaceholder":
    "Bought on Yahoo Auctions, box has some scratches...",
  "addGame.finish": "Finish",
  "addGame.errorTitlePlatform": "Enter a title and group",

  "editGame.title": "Edit item",
  "editGame.titleLabel": "Title",
  "editGame.platformLabel": "Group",
  "editGame.region": "Region",
  "editGame.purchasePrice": "Purchase price",
  "editGame.condition": "Condition",
  "editGame.isPirate": "Pirate / bootleg copy",
  "editGame.notes": "Notes",
  "editGame.tags": "Tags",
  "editGame.tagsHint": "Toggle presets or add your own tags.",
  "editGame.tagsAdd": "Add tag",
  "editGame.errorTitle": "Enter a title",

  "game.noCover": "No cover",
  "game.info": "Info",
  "game.region": "Region",
  "game.condition": "Condition",
  "game.isPirate": "Copy",
  "game.pirateYes": "Pirate / bootleg",
  "game.pirateNo": "Official",
  "game.pirateBadge": "Pirate",
  "game.tags": "Tags",
  "game.boughtFor": "Bought for",
  "game.prices": "Prices",
  "game.priceLoose": "Loose (cart/disc)",
  "game.priceCib": "CIB",
  "game.priceNew": "New (sealed)",
  "game.priceBoxOnly": "Box only",
  "game.priceManualOnly": "Manual only",
  "game.priceYourCondition": "Your condition",
  "game.priceSync": "Sync PriceCharting",
  "game.priceSyncing": "Syncing prices...",
  "game.priceOpen": "Open on PriceCharting",
  "game.priceSyncedAt": "Synced {date}",
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
  "actions.editGame": "Edit item",
  "actions.deleteGame": "Delete item?",
  "actions.deleteGameBody":
    "Delete “{title}” permanently? ROM, images, patches, patch cache, saves (if any), and other files for this item will be removed. This cannot be undone.",

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

  "region.NTSC-J": "NTSC-J",
  "region.NTSC-U": "NTSC-U",
  "region.PAL": "PAL",
  "region.OTHER": "Other",
} as const;

type MessageKey = keyof typeof en;
type Messages = Record<MessageKey, string>;

const uk: Messages = {
  "app.title": "Shellf — Каталог колекції",
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
  "common.gameNotFound": "Елемент не знайдено",
  "common.platform": "Група",
  "common.kind": "Тип",

  "nav.home": "Головна",
  "nav.platforms": "Групи",
  "nav.items": "Колекція",
  "nav.addGame": "Додати елемент",
  "nav.settings": "Налаштування",

  "settings.title": "Налаштування",
  "settings.section.general": "Загальні",
  "settings.section.scraper": "Scraper",
  "settings.section.emulator": "Конфіг емулятора",
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
  "settings.scraperHint":
    "Облікові дані розробника ScreenScraper для пошуку ігор за хешем ROM. Softname має збігатися з назвою ПЗ, яку ви вказали при реєстрації developer-акаунта. Зберігаються в базі (env-змінні лишаються як запасний варіант).",
  "settings.scraperSoftname": "Softname",
  "settings.scraperDevId": "Developer ID",
  "settings.scraperDevPassword": "Developer password",
  "settings.scraperPasswordConfigured": "Збережено — введіть новий пароль, щоб замінити",
  "settings.emulatorHint":
    "JSON-оверрайди поверх public/emulator/config. Ключі: \"_defaults\" або назва ядра (\"nes\", \"snes\").",
  "settings.emulatorJson": "Оверрайди емулятора (JSON)",
  "settings.emulatorInvalidJson": "Невалідний JSON-об’єкт",

  "dashboard.title": "Колекція",
  "dashboard.subtitle": "Огляд вашої колекції",
  "dashboard.totalGames": "Всього елементів",
  "dashboard.spent": "Витрачено",
  "dashboard.marketValue": "Ринкова вартість",
  "dashboard.platforms": "Груп",
  "dashboard.byPlatform": "По групах",
  "dashboard.gameOne": "{count} елемент",
  "dashboard.gameMany": "{count} елементів",

  "platforms.title": "Групи",
  "platforms.subtitle": "Оберіть групу для перегляду колекції",
  "platforms.gameMany": "{count} елементів",
  "platforms.empty": "Ще немає груп",
  "platforms.create": "Нова група",
  "platforms.createName": "Назва групи",
  "platforms.createNamePlaceholder": "Nintendo Entertainment System",
  "platforms.createEmulatorCore": "Ядро емулятора (опційно)",
  "platforms.createKind": "Тип",
  "platforms.createKindRequired": "Оберіть тип…",
  "platforms.createSubmit": "Створити групу",
  "platforms.createErrorName": "Вкажіть назву групи",
  "platforms.createErrorKind": "Оберіть тип (Game, Audio, Video, Card або Book)",

  "platformGames.fallbackTitle": "Група",
  "platformGames.inCollection": "{count} елементів у колекції",
  "platformGames.empty": "Ще немає елементів у цій групі",
  "platformGames.addGame": "Додати елемент",
  "platformGames.edit": "Редагувати групу",

  "items.title": "Колекція",
  "items.subtitle": "{count} елементів",
  "items.allTags": "Усі",
  "items.createTag": "Назва нового тега",
  "items.empty": "Ще немає елементів",
  "items.emptyTag": "Немає елементів з цим тегом",

  "addGame.title": "Додати елемент",
  "addGame.subtitle": "Додайте нову річ до колекції",
  "addGame.step.platform": "Група",
  "addGame.step.rom": "ROM",
  "addGame.step.media": "Медіа",
  "addGame.step.metadata": "Метадані",
  "addGame.titleLabel": "Назва",
  "addGame.platformLabel": "Група",
  "addGame.selectPlatform": "Оберіть групу",
  "addGame.creating": "Створення...",
  "addGame.romLabel": "ROM файл (дамп)",
  "addGame.boxLabel": "Фото боксу",
  "addGame.manualLabel": "Скан мануалу (PDF або зображення)",
  "addGame.uploading": "Завантаження...",
  "addGame.region": "Регіон",
  "addGame.purchasePrice": "Ціна покупки",
  "addGame.condition": "Стан",
  "addGame.isPirate": "Піратська / бутлег копія",
  "addGame.notes": "Нотатки",
  "addGame.notesPlaceholder":
    "Куплено на Yahoo Auctions, є подряпини на коробці...",
  "addGame.finish": "Завершити",
  "addGame.errorTitlePlatform": "Вкажіть назву та групу",

  "editGame.title": "Редагувати елемент",
  "editGame.titleLabel": "Назва",
  "editGame.platformLabel": "Група",
  "editGame.region": "Регіон",
  "editGame.purchasePrice": "Ціна покупки",
  "editGame.condition": "Стан",
  "editGame.isPirate": "Піратська / бутлег копія",
  "editGame.notes": "Нотатки",
  "editGame.tags": "Теги",
  "editGame.tagsHint": "Оберіть пресети або додайте свої теги.",
  "editGame.tagsAdd": "Додати тег",
  "editGame.errorTitle": "Вкажіть назву",

  "game.noCover": "Немає обкладинки",
  "game.info": "Інформація",
  "game.region": "Регіон",
  "game.condition": "Стан",
  "game.isPirate": "Копія",
  "game.pirateYes": "Піратська / бутлег",
  "game.pirateNo": "Офіційна",
  "game.pirateBadge": "Pirate",
  "game.tags": "Теги",
  "game.boughtFor": "Куплено за",
  "game.prices": "Ціни",
  "game.priceLoose": "Loose (картридж/диск)",
  "game.priceCib": "CIB",
  "game.priceNew": "New (запечатана)",
  "game.priceBoxOnly": "Тільки коробка",
  "game.priceManualOnly": "Тільки мануал",
  "game.priceYourCondition": "Ваш стан",
  "game.priceSync": "Синхронізувати PriceCharting",
  "game.priceSyncing": "Синхронізація цін...",
  "game.priceOpen": "Відкрити на PriceCharting",
  "game.priceSyncedAt": "Оновлено {date}",
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
  "actions.editGame": "Редагувати елемент",
  "actions.deleteGame": "Видалити елемент?",
  "actions.deleteGameBody":
    "Видалити «{title}» назавжди? Будуть видалені ROM, зображення, патчі, кеш патчів, сейви (якщо є) та інші файли цього елемента. Цю дію не можна скасувати.",

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

  "region.NTSC-J": "NTSC-J",
  "region.NTSC-U": "NTSC-U",
  "region.PAL": "PAL",
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
