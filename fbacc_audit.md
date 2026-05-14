# fbacc.js — Audit Summary
> Bookmarklet version: **6.4** | Decompressed size: **~189 KB** / **5 022 строки** (после prettier)  
> Тип упаковки: `javascript:` → URI-encode → LZString.decompressFromEncodedURIComponent (base64-URI алфавит)  
> Graph API версия: **v19.0** (актуальная на момент написания скрипта)

---

## 1. Архитектура — карта секций

| # | Секция | Строки | Функции |
|---|--------|--------|---------|
| 0 | Bootstrap / Entry point | 1–9 | IIFE, URL-guard, ESC-listener |
| 1 | Globals & Constants | 17–33 | `currency_symbols` |
| 2 | Auth & Token Extraction | 34–96 | `checkauth`, `getAccessTokenFunc` |
| 3 | Payments — CC Addition | 97–225 | `addCCtoadAccReq2`, `addCCtoadAccForm`, `addCCtoadAccProcessForm` |
| 4 | Ad Account Settings | 226–261 | `ShowEditcurr`, `ProcessEditcurr`, `ShowEdittzone`, `ProcessEdittzone` |
| 5 | Appeals | 262–398 | `appealadcreo`, `appealadsacc`, `appealfp` |
| 6 | Destructive Operations ⚠️ | 399–611 | `delfp`, `deladacc`, `remadacc`, `unhidefp` |
| 7 | Utilities & Helpers | 612–673 | `getJSON`, `checkIpFunc`, `checkVerFunc`, `getURLParameter`, `getCookie`, `copytocb`, `shadowtext` |
| 8 | Page Access Tokens | 674–712 | `getPageToken`, `getAndCopyPageToken` |
| 9 | Popup / Modal System | 713–870 | `initPluginPopup`, `showPluginPopup`, `hidePluginPopup`, `toglePluginPopup`, `destroyPluginPopup`, `getPopupCoords` |
| 10 | Pages — Create & List | 871–1257 | `showAddFP`, `AddFPProcessForm`, `PzrdFPList`, `PzrdSocList`, `PzrdBmList` |
| 11 | BM — Create | 1258–1396 | `showAddBM`, `AddBMProcessForm` |
| 12 | Credit Card Enumeration | 1397–1466 | `getcc` |
| 13 | Page Comments | 1467–1667 | `getFpComments`, `delFpComments` |
| 14 | Ads Inspection | 1668–1964 | `getAccAds` |
| 15 | Page Popup Actions | 1965–2258 | `showMorePopupFpOwnedBmRm`, `showMorePopupFpRoles`, `showMorePopupFpAdsRm`, `showMorePopupFpAds` |
| 16 | Ad Account Popup Actions | 2259–2458 | `showMorePopupAccAds`, `showMorePopupAccCap`, `showMorePopupAccAdsFull`, `showMorePopupAccFull`, `showMorePriv`, `showMorePopupAddCC` |
| 17 | BM Popup Actions | 2459–2959 | `showMorePopupBMAccs`, `showMorePopupBMAccsRm`, `showMorePopupBMAccsAdd`, `showMorePopupBMAccsAddProcessForm`, `showMorePopupBMAccsReq`, `showMorePopupBMAccsReqProcessForm` |
| 18 | BM Users Management | 2960–3209 | `showMorePopupBMUsers`, `showMorePopupBMUsersEdit`, `showMorePopupBMUsersRm`, `showMorePopupBMUsersAdd`, `showMorePopupBMUsersAddProcessForm` |
| 19 | Status Dashboards | 3210–4251 | `showbmstatuspzrd`, `showbmstatus`, `showaccstatusedit`, `showaccstatusupdatename`, `showaccstatus`, `showfpstatus` |
| 20 | BM Token Checker | 4252–4299 | `checkBmFunc` |
| 21 | IndexedDB Settings | 4300–4387 | `pluginDbConnect`, `pluginDbInit`, `pluginDbgetKey`, `pluginDbsetKey` |
| 22 | UI Initialization | 4388–4419 | `initAccstatusPlug` |
| 23 | Tab Navigation | 4420–4469 | `adstabselect` |
| 24 | DOM Helpers | 4470–4492 | `appendtab`, `appendtabplus` |
| 25 | Main Window Controls | 4493–4605 | `mainclosead`, `mainclose`, `mainhide`, `mainunhide`, `mainreload`, `mainconfig`, `mainconfigsave` |
| 26 | Main Load (Entry) | 4606–5022 | `mainload` |

---

## 2. Все GraphQL doc_id

| doc_id | Мутация/операция | Используется в | Статус |
|--------|-----------------|----------------|--------|
| `4126726757375265` | `useBillingAddCreditCardMutation` | `addCCtoadAccReq2` | ⚠️ Может работать, но endpoint через `token_proxy.php` — нестандартный |
| `5197966936890203` | Appeal ad account / Page | `appealadsacc`, `appealfp` | ⚠️ Один и тот же doc_id для двух разных апелляций — подозрительно |
| `4899485650107392` | `usePagesCometDeletePageMutation` | `delfp` | ✅ Активная мутация удаления страницы |
| `4920939114687785` | Publish/unhide Page | `unhidefp` | ✅ |
| `4722866874428654` | `AdditionalProfilePlusCreationMutation` (NEW) | `AddFPProcessForm` | ✅ |
| `9339938679410311` | `page_create` (OLD) | `AddFPProcessForm` | ⚠️ Старый стиль создания, может быть deprecated |
| `5196344227155252` | Remove Page from BM ownership | `showMorePopupFpOwnedBmRm` | ❓ |
| `6139497919470985` | (используется дважды) | `showMorePopupBMAccs` (строки 1130, 1199) | ❓ Неизвестная мутация |
| `7183377418404152` | `BusinessCreationMutation` | `AddBMProcessForm` | ✅ |

---

## 3. Все API endpoints

### Graph API (v19.0) — стандартные
| Endpoint | Метод | Что делает |
|----------|-------|-----------|
| `/act_{id}?fields=name,id,adtrust_dsl,...` | GET | Основная информация об аккаунте |
| `/act_{id}/ads?fields=...` | GET | Список рекламных объявлений |
| `/act_{id}?fields=funding_source_details` | GET | Данные карты оплаты |
| `/act_{id}` | POST | PATCH настроек аккаунта (currency, timezone) |
| `/act_{id}/users/{userid}` | DELETE | Удаление пользователя из аккаунта |
| `/me/businesses?fields=id,...,creditcards` | GET | BM список + карты |
| `/me/adaccounts?fields=id,...,funding_source_details` | GET | Все аккаунты пользователя |
| `/me?fields=accounts.limit(200)` | GET | Все страницы пользователя |
| `/{bmid}/adaccounts` | GET/POST | Список/создание аккаунтов в BM |
| `/{bmid}/adaccount` | POST | Создание нового аккаунта в BM |
| `/{bmid}/members` | GET | Члены BM |
| `/{bmid}/userpermissions` | POST/DELETE | Управление пользователями BM |
| `/{bmid}/client_ad_accounts` | POST | Запрос доступа к аккаунту |
| `/{page_id}?fields=access_token` | GET | Page access token |
| `/me/businesses` | GET | Проверка токена |
| `/4565016393523068?fields=id,title,description` | GET | Версионная проверка плагина |

### Legacy AJAX endpoints (нестандартные)
| Endpoint | Статус |
|----------|--------|
| `business.secure.facebook.com/ajax/payment/token_proxy.php?tpe=/api/graphql/` | ⚠️ Нестандартный прокси для платёжных мутаций |
| `/ads/ajax/ads_appeal_creative/` | 🔴 Вероятно сломан — legacy AJAX, не GraphQL |
| `/ads/ajax/account_close/` | ⚠️ Legacy — ответ не проверяется в коде |

### Facebook внутренние URL (hardcoded ссылки в UI)
- `/accountquality`, `/diagnostics`, `/primary_location/info`
- `mbasic.facebook.com/support/forms/flow_view?id=...` — формы апелляций
- `business.facebook.com/help/contact/...` — хелп-формы

---

## 4. Что работает ✅

- **Основной поток**: извлечение токена → отображение данных аккаунта (graph v19.0) — рабочий
- **IndexedDB storage**: полноценная persist-система для настроек, работает корректно
- **BM управление**: создание аккаунтов, управление пользователями через graph v19.0 — стандартный API
- **Page token**: `getPageToken` / `getAndCopyPageToken` — стандартный graph API
- **Tab навигация**: работает через classList, сохраняет состояние
- **Создание BM** (`AddBMProcessForm`): через GraphQL мутацию, doc_id `7183377418404152`
- **Создание Pages** (NEW style): через `AdditionalProfilePlusCreationMutation`
- **Popup система**: самодостаточная, без зависимостей
- **getcc()**: агрегация карт из BM и ad accounts — чистый graph v19.0
- **showaccstatus(), showbmstatus(), showfpstatus()**: ключевые дашборды — активно используют graph v19.0

---

## 5. Что явно устарело / сломано 🔴

### Критически устаревшее

1. **`getAccessTokenFunc()` — хрупкий DOM-scraping**
   - Парсит `innerHTML` скриптов регексом `/\"EA[A-Za-z0-9]{20,}/gm`
   - Использует FB внутренний `require("DTSGInitialData")`, `require("CurrentUserInitialData")`, `require("SiteData")`
   - Ломается при каждом обновлении FB frontend bundle
   - **Риск**: может не найти токен, тихо продолжать с `undefined`

2. **`appealadcreo()` — legacy AJAX endpoint**
   ```
   /ads/ajax/ads_appeal_creative/
   ```
   - Hardcoded параметры: `__hs=19153.BP:ads_manager_pkg.2.0.0.0.`, `__rev=1005666349`
   - Скорее всего не работает — endpoint не GraphQL

3. **`deladacc()` — response не проверяется**
   - Использует `/ads/ajax/account_close/` без валидации ответа
   - `alert("Ads Account is scheduled to be close....")` показывается всегда, независимо от успеха

4. **`remadacc()` — HTTP метод конфликт (BUG)**
   ```javascript
   urlencoded.append("method", "DELETE");  // в теле
   method: "GET",                           // в fetch()
   ```
   - Отправляет GET запрос вместо DELETE → операция не выполняется на сервере

5. **Hardcoded `__rev = 1005599768` в `addCCtoadAccReq2()`**
   - Устаревший build revision — FB сервер может отклонить
   - `__spin_r` у других функций берётся из `window.spinR` (правильно), здесь hardcode

6. **`appealadsacc()` / `appealfp()` — hardcoded appeal comment**
   ```javascript
   "appeal_comment": "I'm not sure which policy was violated."
   ```
   - Один и тот же шаблонный текст для всех апелляций

### Мёртвый код (dead code)

7. **Tab 2 (AdCreo) — закомментирован**
   - HTML tab `tabli2` / `#tab2` существует в DOM, но `onclick` закомментирован
   - Весь код внутри `adstabselect(2)` (строки ~4840–4913) — огромный блок в `/* ... */`

8. **Tab 6 — закомментирован**
   - `tabli6` присутствует в HTML, но тоже отключён

9. **Несколько закомментированных вариантов мутаций**
   - В `deladacc()` закомментированы `doc_id: 4899485650107392` (GraphQL вариант)
   - В `remadacc()` закомментирован dtsg-вариант
   - В `AddBMProcessForm()` закомментирован альтернативный mutation вызов

10. **`mainconfigsave()` — частично закомментировано**
    ```javascript
    // await pluginDbsetKey('pzrdbm', ...);
    // await pluginDbsetKey('pzrdacc', ...);
    ```
    В UI настройки присутствуют (и есть `<!-- ... -->` в HTML), но не сохраняются.

11. **CC year list устарел**
    ```html
    <option value="2022">2022</option>...
    ```
    Годы начинаются с 2022 — карты с истёкшим сроком будут в начале списка.

---

## 6. Риски / проблемы безопасности ⚠️

| Проблема | Где | Уровень |
|----------|-----|---------|
| Передача полного номера карты в POST body | `addCCtoadAccReq2`, строки 144–145 | 🔴 КРИТИЧНО |
| Токен доступа в URL (GET параметры) | `getPageToken`, весь `getJSON` | 🟡 Средний — токен попадает в логи сервера |
| Confirm-диалог перед удалением страниц/аккаунтов | `delfp`, `deladacc`, `remadacc` | 🟡 Защита есть, но недостаточная |
| `eval`-подобное выполнение через `innerHTML = decompressed` | bootstrap скрипт (в bookmarklet-оболочке) | 🟡 Только при первом запуске |
| Globally polluted `window.*` namespace | Все функции | 🟡 Конфликт с другими скриптами |
| Token scraping из DOM может захватить чужой токен | `getAccessTokenFunc()` | 🟡 |
| XSS potential в appendtab(innerHTML) | Секции 24, все appendtab вызовы | 🟡 Данные из API вставляются без sanitize |

---

## 7. Внешние сервисы / зависимости

| Сервис | Где | Назначение |
|--------|-----|-----------|
| `fbacc.io` | `checkVerFunc`, UI update link | Сайт плагина — версионная проверка |
| `FB object ID 4565016393523068` | `checkVerFunc` | FB объект плагина — `title` = номер версии, `description` = changelog/объявление |
| `cdnjs.cloudflare.com` | Нет | Не используется |
| IndexedDB | Секция 21 | Локальное хранилище настроек |

---

## 8. Что можно спасти для нового FB Account Inspector

### Высокая ценность — переиспользовать как есть:
- **`pluginDbConnect/Init/getKey/setKey`** — чистая IndexedDB абстракция, хорошо структурирована
- **`getPageToken/getAndCopyPageToken`** — простые, стандартный API
- **Popup система** (`initPluginPopup` и т.д.) — самодостаточная
- **`getcc()`** — логика агрегации карт из BM + accounts
- **`showaccstatus/showbmstatus/showfpstatus`** — богатые поля graph API, можно адаптировать запросы
- **`currency_symbols`** — таблица валют
- **BM Users CRUD** (секция 18) — работает через стандартный graph v19.0

### Средняя ценность — переработать:
- **`getAccessTokenFunc()`** — идею сохранить, но переписать: использовать `window.__FB_DATA__` или более стабильные source
- **`mainload()`** — хороший шаблон последовательной загрузки данных
- **Appeals (секция 5)** — GraphQL мутации, обновить doc_id и сделать comment настраиваемым
- **BM account creation** (секция 17) — рабочая логика batch-создания

### Выбросить:
- `appealadcreo()` — весь, endpoint мёртв
- `deladacc()` — весь legacy AJAX, response unchecked
- `remadacc()` — исправить HTTP метод или переписать
- Tab 2 (AdCreo) — огромный мёртвый блок кода
- Hardcoded `__rev`, `__hs`, `__comet_req` в апелляциях
- Hardcoded CC years начиная с 2022
- `checkIpFunc()` — дамп HTML диагностики в tab4

---

## 9. Структура данных для нового инспектора

### Глобальный стейт (из `getAccessTokenFunc`):
```javascript
window.privateToken  // EA... access token
window.dtsg          // fb_dtsg CSRF token
window.socid         // user numeric ID
window.selectedacc   // current ad account ID (без "act_")
window.spinR         // __spin_r
window.spinB         // __spin_b
window.spinT         // __spin_t
window.hsi           // __hsi
window.shortname     // user first name
window.fullname      // user full name
window.pageauth      // true если залогинен как Page
```

### IndexedDB schema:
```javascript
// DB: "fbacc_db", store: "fbacc_store", keyPath: "id"
// {id: "tab",          value: "1"|"3"|"4"|"5"}
// {id: "convert",      value: "0"|"1"}  // convert to USD
// {id: "pzrdfp",       value: "0"|"1"}  // PZRD page status mode
// {id: "hidemainontab",value: "0"|"1"}  // hide main account on tabs
```

---

## 10. Рекомендации для рефакторинга

1. **Токен-экстракция**: вынести в отдельный модуль, добавить retry и fallback через cookies
2. **API слой**: создать единый `fbApi(endpoint, params)` wrapper вместо повторяющихся fetch-блоков
3. **GraphQL doc_id**: вынести в константы с именами — сейчас невозможно понять что делает каждый без анализа
4. **HTML генерация**: заменить строковую конкатенацию на template functions или документные фрагменты
5. **Ошибки**: добавить единый error handler вместо разрозненных `alert()`
6. **CC форма**: обновить годы, добавить маскирование номера карты при вводе
7. **Appeals**: сделать comment настраиваемым, обновить до актуальных endpoint
8. **remadacc**: исправить HTTP метод (GET → DELETE) или использовать graph API корректно
9. **Dead code**: удалить Tab 2/6, весь закомментированный код, устаревшие fallback мутации
10. **Версионирование**: заменить FB object-based version check на собственный endpoint

---

*Audit выполнен: статический анализ decompressed_raw.js (LZString → prettier) без запуска кода*
