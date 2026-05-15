# ACTION CAPABILITY MATRIX (Phase 3)

Короткая матрица допустимых controlled actions для безопасного rollout.

| actionId | module | destructive | requiresAdAccount | risk | enabled | execution mode |
|---|---|---:|---:|---|---:|---|
| accounts.load_snapshot | accounts | no | no | low | yes | read-only |
| billing.load_snapshot | billing | no | yes | low | yes | read-only |
| businesses.load_snapshot | businesses | no | no | low | yes | read-only |
| pages.load_snapshot | pages | no | no | low | yes | read-only |
| diagnostics.load_snapshot | diagnostics | no | no | low | yes | read-only |
| ads.refresh_snapshot | ads | no | yes | low | no | reserved |
| billing.refresh_snapshot | billing | no | yes | low | no | reserved |

## Правила применения

1. Даже `enabled` action не запускается без policy allowlist (`allowedActionIds`).
2. Для action с `requiresAdAccount=true` обязателен selected ad account context.
3. Для destructive action требуется явное подтверждение (confirm stage).
4. Startup оставляем в режиме disabled-by-default до отдельного включения policy flag.
