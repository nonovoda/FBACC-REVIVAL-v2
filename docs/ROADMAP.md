# roadmap.md

# FBInspector.js — Full Rebuild Roadmap

## Основа проекта

Новый скрипт `FBInspector.js` необходимо разрабатывать на основе анализа и reverse-engineering следующих файлов:

- `fbacc_annotated.js`
- `fbacc_audit.md`
- `fbacc_decompressed_raw.js`

Эти файлы содержат:
- распакованный исходник старого `fbacc.js`;
- структурированный audit legacy-архитектуры;
- список GraphQL mutations;
- список API endpoints;
- карту UI и dashboards;
- анализ сломанных, unsafe и deprecated частей.

Важно:
не пытаться рефакторить старый `fbacc.js` напрямую.

Нужно:
- извлечь полезное operational ядро;
- переработать архитектуру;
- переписать UI;
- удалить legacy/musor;
- создать современный internal utility tool.

---

# 1. Главная идея

Создать:

```txt
FBInspector.js

Формат:

bookmarklet utility;
compact dark utility UI;
internal operator tool;
lightweight operational inspector для:
ad accounts;
BM;
pages;
billing;
diagnostics.
2. Главные принципы

Скрипт должен:

быстро показывать полезную operational информацию;
помогать диагностировать аккаунты;
помогать ориентироваться в структуре BM;
помогать быстро копировать данные;
помогать быстро переходить в нужные разделы Facebook.

Скрипт НЕ должен:

содержать legacy spaghetti;
использовать broken AJAX endpoints;
использовать unsafe payment logic;
использовать destructive automation по умолчанию;
использовать hardcoded deprecated mutations;
использовать packed/compressed architecture.
3. Graph API

Полностью обновить API layer.

Использовать:

https://graph.facebook.com/v25.0/

Создать единый API wrapper:

const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_BASE = "https://graph.facebook.com/v25.0/";

Обязательные функции:

fbApi.get()
fbApi.post()
fbApi.delete()
fbApi.getAllPages()
fbApi.withRetry()
fbApi.normalizeError()

Требования:

credentials: include;
retry logic;
sequential loading;
rate-limit friendly;
centralized error handling;
no hardcoded legacy revisions;
no hardcoded __rev/__spin.
4. Что сохранить из оригинального fbacc
4.1 Account Inspector

Сохранить и переработать:

account id;
account name;
account status;
currency;
timezone;
spend cap;
adtrust / limits;
balance / spend;
ownership;
BM relation;
quick links:
open ads manager;
open billing;
open account settings;
open account quality;
copy account id.
4.2 Business Manager Inspector

Сохранить:

BM name;
BM id;
verification/status;
owned accounts;
client accounts;
users/members;
quick links:
open BM;
open business settings;
copy BM id.
4.3 Page Inspector

Сохранить:

page id;
page name;
page ownership;
BM relation;
page token copy;
restriction info;
quick links:
open page;
copy page id;
copy token.
4.4 Billing Inspector

Сохранить только safe read-only functionality:

funding source details;
masked cards;
billing status;
BM cards aggregation;
billing quick links.

Полностью удалить:

raw card input;
add card forms;
CVC handling;
payment token proxy requests.
4.5 Ads / Creative Inspector

Сохранить:

ad id;
ad name;
ad status;
effective status;
creative id;
rejection/review info;
quick links.
4.6 IndexedDB / Local Storage

Сохранить идею local persistence:

selected tab;
filters;
UI preferences;
hidden sensitive info;
selected BM/account.
5. Что переработать
5.1 AuthService

Старый token extraction очень fragile.

Создать новый:

AuthService

Функции:

getAccessToken()
getCurrentUserId()
getCurrentAdAccountId()
getDtsg()
getSiteData()

Fallback chain:

window.__accessToken
internal Ads Manager context
safe DOM scan
explicit UI error

Нельзя silently continue with undefined token.

5.2 Appeals

Не переносить legacy appeal AJAX logic.

Вместо этого:

account quality links;
page quality links;
support links;
diagnostics links.

Если позже добавлять appeal actions:

только verified endpoints;
editable text;
explicit confirmation;
detailed logs.
5.3 User / Permission Management

В v1:

read-only users/roles inspector.

В будущем:

remove user;
change role;
request access.

Только через:

danger zone;
double confirmation;
dry-run preview;
logs.
5.4 BM Tools

Перенести:

BM account creation;
BM account requests;
BM user management.

Но:

только после стабилизации core inspector;
только через modern Graph API;
без legacy mutations.
6. Что удалить полностью

Удалить без переноса:

LZString packing;
packed bookmarklet architecture;
old tab system;
appendtab spaghetti UI;
dead tabs;
fbacc.io updater;
external checks;
PZRD;
raw HTML diagnostics;
legacy AJAX endpoints;
hardcoded __rev/__hs/__spin;
raw CC handling;
destructive auto-actions;
unsafe mutations;
hardcoded appeal comments;
deprecated GraphQL doc_id flows.
7. Новая архитектура
FBInspector/
│
├── index.js
│
├── core/
│   ├── config.js
│   ├── auth.js
│   ├── api.js
│   ├── logger.js
│   ├── storage.js
│   ├── links.js
│   └── utils.js
│
├── modules/
│   ├── accounts.js
│   ├── businesses.js
│   ├── pages.js
│   ├── billing.js
│   ├── ads.js
│   ├── users.js
│   └── diagnostics.js
│
├── ui/
│   ├── shell.js
│   ├── tabs.js
│   ├── table.js
│   ├── cards.js
│   ├── filters.js
│   ├── details-panel.js
│   └── styles.js
│
└── build/
    └── bookmarklet.js
8. UI / UX

Использовать текущую дизайн-систему FB Bookmarklet Tools.

Стиль:

compact dark utility UI;
internal operator aesthetic;
minimalistic;
dense layout;
no SaaS;
no cyberpunk.
9. Основной layout
Header
Toolbar
Tabs
Main table/list
Details panel
Logs/footer

Tabs:

Accounts
Businesses
Pages
Billing
Ads
Settings
10. Основной UX flow
1. Open tool
2. Load data
3. Browse/filter/search
4. Copy/open
5. Inspect relationships/statuses
11. Search / Filters

Добавить:

search input;
filter by status;
filter by BM;
filter by ownership;
sorting;
compact/full table mode.
12. Quick Actions

Safe actions only:

Copy ID
Copy Token
Open BM
Open Billing
Open Account
Open Settings
Open Quality
Refresh Data
Export JSON/CSV
13. Logs / Statuses

Добавить:

loading states;
success/error states;
compact logs;
request context;
retry info.
14. Производительность

Важно:

sequential loading;
safe API pacing;
no aggressive parallel spam;
avoid rate limits;
pagination support;
caching where possible.
15. Bookmarklet Requirements

Скрипт должен:

работать как bookmarklet;
корректно закрываться;
удалять root/style при destroy;
не оставлять мусор в DOM;
не конфликтовать с другими tools;
иметь cleanup system.
16. MVP v1
Accounts
load all accounts;
statuses;
limits;
BM relation;
filters;
quick links.
Businesses
load BM;
verification;
users;
owned/client accounts.
Pages
load pages;
ownership;
tokens;
restrictions.
Billing
read-only funding info.
Actions
copy/open/export only.
17. v2

Добавить controlled actions:

update account name;
update timezone/currency;
request account access;
BM account creation;
BM user management.

Все actions:

preview;
confirmation;
logs;
no hidden automation.
18. v3

Advanced diagnostics:

permissions diagnostics;
token health;
ownership map;
quality dashboards;
export reports;
relation graphs.
19. Безопасность

Обязательно:

не хранить access token;
не логировать токены;
masked sensitive values;
no raw card handling;
no silent destructive actions;
no hidden requests;
no external servers.
20. Build strategy

Workflow:

Readable source
→ build bookmarklet
→ optional minified artifact

Не использовать:

compressed payload;
giant one-line source;
LZString packing.
21. Definition of Done

v1 готов если:

работает как bookmarklet;
работает в Ads Manager;
использует Graph API v25.0;
показывает accounts/BM/pages;
имеет filters/search;
имеет copy/open actions;
не содержит dangerous automation;
не содержит legacy AJAX;
код readable/modular;
UI соответствует FB Bookmarklet Tools system.
22. Phases
Phase 1 — Foundation
architecture;
AuthService;
API wrapper;
Logger;
Storage;
UI shell.
Phase 2 — Read-only Inspector
Accounts;
Businesses;
Pages;
Billing;
Ads;
diagnostics.
Phase 3 — Controlled Actions
safe account actions;
BM tools;
user management;
request flows;
logs/preview/confirmations.
Phase 4 — Advanced Diagnostics
quality tools;
ownership maps;
permissions diagnostics;
export reports.
23. Финальная цель

Не “починить fbacc”.

Нужно создать:

FBInspector.js

Современный:

readable;
modular;
operational;
safe;
scalable;
internal utility platform.

Сохранив максимум полезного operational опыта оригинального fbacc.