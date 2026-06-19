
## Diagnóstico

Hoje o Hermes só tem 3 ferramentas reais em `src/lib/hermes/tools/`:

- `time-tool` — data/hora e datas relativas em PT-BR
- `web-search-tool` — busca DuckDuckGo
- `web-fetch-tool` — leitura de URL

Tudo que envolve **estado do próprio app** (tarefas, listas, notas, agenda, timer, memória, alarmes, clima, perfil) o Hermes só consegue *criar* via os sub-agentes (`home-agent`, `agenda-agent`, `timer-agent`). Ele **não consegue ler, atualizar, completar, remover, buscar ou raciocinar sobre o que já existe**. É isso que dá a sensação de "faltam tools".

## Tools propostas (todas em `src/lib/hermes/tools/`, expostas via `tools/index.ts` e registradas no `tool-router.ts`)

### 1. Leitura do estado do app (read-only, puro cliente)
- `tasks-tool` — `listTasks({ when?: "today"|"week"|"overdue"|"all", tag?, status? })`, `findTask(query)`, `getTaskStats()`
- `lists-tool` — `listLists()`, `getList(idOrTitle)`, `findListItem(query)`
- `notes-tool` — `listNotes({ recent?, query? })`, `getNote(idOrTitle)`
- `agenda-tool` — `listBlocks({ date? | range? })`, `findFreeSlots({ date, minMinutes })`
- `timer-tool` — `getActiveTimer()`, `getTimerHistory({ range? })`
- `alarms-tool` — `listAlarms()`, `getNextAlarm()`
- `profile-tool` — `getProfile()`, `getPreferences()` (resumo seguro, sem chaves)

### 2. Mutação assistida (com confirmação via `HermesConfirmation`)
- `task-mutations` — `completeTask`, `updateTask` (dueAt/reminderAt/tag/title), `deleteTask`, `moveTaskToToday`
- `list-mutations` — `toggleItem`, `addItems`, `removeItems`, `renameList`, `deleteList`
- `note-mutations` — `updateNote`, `deleteNote`, `extendTtl`
- `block-mutations` — `rescheduleBlock`, `cancelBlock`
- `timer-control` — `pauseTimer`, `stopTimer`, `extendTimer(minutes)`

Todas roteadas pelo loop existente `useExecuteActions` (`src/lib/agents/execute.ts`) — adiciono os novos `AgentAction` types em `src/lib/agent.ts`.

### 3. Memória e aprendizado (já existe infra, falta tool)
- `memory-tool` — `recallMemories({ query, type? })`, `saveMemory({ text, type })`, `forgetMemory(id)` em cima de `src/lib/hermes/memory-store.ts` e `learning/memory.ts`
- `history-tool` — `recallRecentEvents({ kind?, since? })` em cima de `learning/event-store.ts`

### 4. Contexto externo
- `weather-tool` — wrapper sobre `src/lib/weather.ts` (`getWeather({ when?: "now"|"today"|"tomorrow" })`)
- `calc-tool` — avaliador aritmético seguro (sem `eval`) para "quanto é…", durações, somas de minutos
- `units-tool` — conversões simples de tempo/data ("90 min em h", "quantos dias até 10/12")

### 5. Comunicação / saída
- `notify-tool` — agenda notificação local via `notification-service` (`scheduleNotification({ title, body, at })`)
- `share-tool` — `copyToClipboard(text)` e `buildShareText(entity)` para o usuário compartilhar uma tarefa/lista

## Integração

1. Criar cada arquivo em `src/lib/hermes/tools/<nome>.ts` seguindo o padrão dos atuais (funções puras + tipos exportados).
2. Reexportar tudo em `src/lib/hermes/tools/index.ts`.
3. Estender `tool-router.ts` com novas intents (regex PT-BR: "minhas tarefas", "o que tenho hoje", "marca como feito", "lembra do que…", "clima", "quanto é…", "me avisa…").
4. Estender `AgentAction` em `src/lib/agent.ts` com os tipos de mutação e ligar em `useExecuteActions`.
5. Mutações destrutivas (delete/cancel) passam por `HermesConfirmation` antes de executar.
6. Sem mudanças visuais — o chat continua igual; apenas o Hermes passa a entender e agir sobre o estado existente.

## Escopo opcional (perguntar depois)

Se quiser, em uma próxima rodada: tool de export (Markdown/JSON), tool de import por colagem, tool de resumo diário automático.

## Sugestão de priorização

Fase 1 (maior ganho imediato): `tasks-tool` + `task-mutations` + `agenda-tool` + `memory-tool`.
Fase 2: `lists-tool` + `notes-tool` + mutações correspondentes + `timer-tool`/`timer-control`.
Fase 3: `weather-tool`, `calc-tool`, `notify-tool`, `share-tool`.

Posso começar pela Fase 1 já no próximo passo?
