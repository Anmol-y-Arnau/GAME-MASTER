# Game Master

**Director de orquesta para Claude Code.** Routing determinista en JavaScript (0 tokens, 72ms) + delegacion inteligente via LLM. Detecta automaticamente que necesitas y delega al agente, skill, MCP o comando optimo entre 80+ herramientas disponibles.

## Arquitectura

```
Usuario escribe prompt
        |
   game-master-router.js  (JavaScript, 0 tokens, 72ms)
   |  Detecta stack del proyecto (12 lenguajes)
   |  Clasifica complejidad (N1-N4)
   |  Detecta dominios (30 categorias)
   |  Selecciona modelo (haiku/sonnet/opus)
   |  Aplica tool scoping por agente
   |  Resuelve skills por keyword (no por dominio)
        |
   [GM-ROUTER] lineas inyectadas en contexto
        |
   Game Master LLM  (model: sonnet)
   |  Sigue las recomendaciones del router
   |  Delega con template obligatorio (ROL/CONTEXTO/TAREA/OUTCOME)
   |  Ejecuta checklist por nivel (CODE->TEST->REVIEW->VERIFY)
   |  Paraleliza agentes independientes
   |  Verifica con evidencia antes de reportar "hecho"
```

### Por que hibrido?

Un prompt que le dice al LLM "elige la mejor herramienta" gasta tokens y falla el 20-40% del tiempo. El routing en JavaScript es gratis, determinista, y tiene 0 false positives (probado con word boundary matching + 276 keywords explicitas).

## Archivos

| Archivo | Tipo | Funcion |
|---|---|---|
| `game-master.md` | Agente Claude Code | Prompt del orquestador (5 reglas + catalogo de 80+ skills) |
| `game-master-router.js` | Script Node.js | Routing determinista: 30 dominios, 276 keywords, model selection, tool scoping |
| `gm-session-start.js` | Hook SessionStart | Detecta stack del proyecto una vez por sesion |
| `gm-prompt-route.js` | Hook UserPromptSubmit | Pre-enruta cada prompt antes de que el LLM lo procese |
| `settings.json` | Config Claude Code | 10 hooks activos (format, typecheck, console.log, quality gate, compact, session, cost tracking) |
| `agents/` | Agentes sub-delegados | 11 agentes con tool scoping en frontmatter |

## Cobertura

### 30 Dominios con routing directo

| Categoria | Dominios | Skills/Comandos |
|---|---|---|
| **Desarrollo** | database, security, frontend, backend, testing, deploy, performance, git | `database-migrations`, `/cso`, `frontend-design`, `api-design`, `/tdd`, `/ship`, etc. |
| **SEO** | seo, ai_seo | 14 comandos: `/seo`, `/seo-audit`, `/seo-meta`, `/seo-schema`, `/seo-fix`, `/seo-speed`, etc. |
| **Marketing** | marketing, email_outreach, social, sales | `marketing-ideas`, `marketing-psychology`, `cold-email`, `email-sequence`, `social-content`, `sales-enablement`, `pricing-strategy` |
| **CRO** | cro | `page-cro`, `form-cro`, `signup-flow-cro`, `onboarding-cro`, `popup-cro`, `paywall-upgrade-cro`, `churn-prevention`, `ab-test-setup` |
| **Contenido** | content | `article-writing`, `content-engine`, `copywriting`, `humanizer` |
| **Research** | research | `deep-research`, `exa-search`, `market-research`, `competitor-alternatives` |
| **Video/Media** | video | `video-editing`, `ffmpeg`, `remotion-render`, `motion-designer`, `fal-ai-media` |
| **Documentos** | documents, excel | `pdf`, `docx`, `pptx`, `xlsx` + MCP `excel-mcp-server` |
| **Diagramas** | diagrams | `mermaidjs-v11` (24+ tipos de diagrama) |
| **Design** | design, design_advanced, frontend | `design-system`, `design-consultation`, `design-shotgun`, `awwwards-animations`, `ui-ux-pro-max` |
| **Debugging** | debugging | `investigate`, `showcase-systematic-debugging` |
| **Infra** | browser, documentation, review, planning, mcp_dev, repo_analysis | `/browse`, `/qa`, `make-plan`, `mcp-builder`, `repomix` |

### 12 Stacks detectados automaticamente

TypeScript, Next.js, React, Python, Go, Rust, Flutter/Dart, Kotlin, C++, Swift, PHP, Java — via `package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.

### 4 Niveles de complejidad + Model Routing

| Nivel | Criterio | Modelo | Cadena obligatoria |
|---|---|---|---|
| **N1 Trivial** | 1-10 lineas, 1 archivo, mecanico | `haiku` | Directo → verificar |
| **N2 Simple** | 10-50 lineas, 1-2 archivos | `sonnet` | CODE → TEST → VERIFY |
| **N3 Moderado** | 50-200 lineas, 2-5 archivos | `sonnet` | PLAN → CODE → TEST → REVIEW → VERIFY |
| **N4 Complejo** | >200 lineas, >5 archivos | `opus` | PLAN → ARCH → CODE → TEST → REVIEW+SECURITY (paralelo) → VERIFY |

El clasificador tiene un guard `neverTrivial` que impide que temas como login, auth, database, pagos sean clasificados como N1.

### 11 Agentes con Tool Scoping

Cada agente tiene herramientas restringidas en su frontmatter — no acceden a mas de lo necesario:

| Agente | Tools | Funcion |
|---|---|---|
| `reviewer` / `code-reviewer` | Read, Grep, Glob | Review solo lectura |
| `code-analyzer` | Read, Grep, Glob | Analisis de calidad |
| `tester` / `tdd-guide` | Read, Edit, Bash, Grep, Glob | Tests (sin Write) |
| `planner` | Read, Grep, Glob, TodoWrite | Planificacion |
| `architect` | Read, Grep, Glob, TodoWrite | Diseno de sistema |
| `security-auditor` | Read, Grep, Glob, Bash | Auditoria + checks |
| `coder` | Read, Write, Edit, Bash, Grep, Glob | Implementacion |
| `typescript-specialist` | Read, Write, Edit, Bash, Grep, Glob | Implementacion TS |
| `cicd-engineer` | Read, Write, Edit, Bash, Grep, Glob | CI/CD y deploy |

Los alias (`code-reviewer`, `tdd-guide`) existen porque Sonnet gravita naturalmente hacia esos nombres. Ambos resuelven al mismo agente con las mismas tools.

### 10 Hooks Activos

| Hook | Tipo | Funcion |
|---|---|---|
| `gm-session-start.js` | SessionStart | Detecta stack del proyecto |
| `gm-prompt-route.js` | UserPromptSubmit | Pre-routing determinista |
| `post-edit-format.js` | PostToolUse:Edit | Auto-format con Biome/Prettier |
| `post-edit-typecheck.js` | PostToolUse:Edit | TypeScript check tras editar .ts |
| `post-edit-console-warn.js` | PostToolUse:Edit | Aviso console.log |
| `quality-gate.js` | PostToolUse:Write | Quality checks en archivos nuevos |
| `suggest-compact.js` | PreToolUse | Sugiere /compact cada 50 tool calls |
| `session-end.js` | Stop | Persiste resumen de sesion |
| `check-console-log.js` | Stop | Audita console.log en archivos modificados |
| `cost-tracker.js` | Stop | Tracking de costes → `~/.claude/metrics/costs.jsonl` |

### Keyword Matching (0 false positives)

El router usa word boundary matching para evitar falsos positivos:

- Keywords < 6 chars: `\bkeyword\b` (regex con word boundary)
- Keywords 6+ chars: `includes()` (seguro, sin riesgo de substring)
- Multi-word phrases: `includes()` (seguro por naturaleza)

Para cubrir formas sufijadas (auth → authentication, test → tests), se anaden como keywords explicitas en vez de usar regex parciales. Esto elimina TODOS los false positives sin introducir false negatives.

**Ejemplos que antes fallaban y ahora funcionan:**

| Prompt | Antes | Ahora |
|---|---|---|
| "genera PDF con la valoracion de la propiedad" | deploy, git (por "ci" en valora**ci**on, "pr" en **pr**opiedad) | documents → skill `pdf` |
| "servicio basico de facturacion" | deploy (por "ci" en servi**ci**o) | limpio |
| "quien es el author de este modulo" | security (por "auth" en **auth**or) | limpio |
| "arregla el bug de login" | N1 trivial | N2 + security (neverTrivial guard) |

### Skill Resolution por Keyword

Para dominios con multiples skills (como documents o CRO), el router resuelve la skill especifica por keyword, no por dominio:

```
"genera un PDF" → solo skill: pdf
"crea una presentacion" → solo skill: pptx
"genera el contrato" → solo skill: pdf
"optimiza el signup flow" → solo skill: signup-flow-cro
"reduce el churn" → solo skill: churn-prevention
```

### Patrones de Multi-Agente

El Game Master sabe cuando lanzar agentes en paralelo:

```
# Review paralelo (N3+)
EN PARALELO: reviewer + security-auditor + code-analyzer

# Research paralelo
EN PARALELO: deep-research + exa-search + context7

# Multi-perspectiva (decisiones criticas)
EN PARALELO: reviewer("evalua opcion A") + reviewer("evalua opcion B")

# Divide-and-conquer (N4)
EN PARALELO: coder("modulo auth") + coder("modulo payments") + coder("modulo notifications")
```

### Sistema Anti-Alucinacion (4 capas)

1. **Verificar antes de afirmar** — usa herramienta (Read, Grep, Bash, context7). Si no puedes verificar: "No puedo confirmar esto"
2. **Confidence scoring** — `[VERIFICADO]` / `[MEDIA]` / `[DESCONOCIDO]`. URLs, versiones, flags: solo VERIFICADO o DESCONOCIDO
3. **Santa Method** (alto riesgo) — 2 revisores independientes en paralelo, ambos pasan = entregar
4. **Verificar antes de cerrar** — ejecutar comando, leer output, mostrar evidencia

## Instalacion

### Requisitos

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) con API key
- [Node.js](https://nodejs.org/) v18+

### Instalar

```bash
# 1. Clonar
git clone https://github.com/Anmol-y-Arnau/GAME-MASTER.git

# 2. Copiar agente + agentes delegados
cp GAME-MASTER/game-master.md ~/.claude/agents/
cp -r GAME-MASTER/agents/* ~/.claude/agents/

# 3. Copiar scripts de routing
mkdir -p ~/.claude/scripts/hooks
cp GAME-MASTER/game-master-router.js ~/.claude/scripts/hooks/
cp GAME-MASTER/gm-session-start.js ~/.claude/scripts/hooks/
cp GAME-MASTER/gm-prompt-route.js ~/.claude/scripts/hooks/

# 4. Copiar settings (o merge manual si ya tienes settings)
cp GAME-MASTER/settings.json ~/.claude/settings.json
```

### Verificar instalacion

```bash
# Test de routing
echo '{"prompt":"crea un endpoint de autenticacion con JWT"}' | \
  node ~/.claude/scripts/hooks/game-master-router.js prompt 2>&1

# Debe mostrar:
# [GM-ROUTER] Nivel: N3
# [GM-ROUTER] Modelo recomendado: sonnet
# [GM-ROUTER] Dominios: security, backend
# [GM-ROUTER] Agentes recomendados: security-auditor, backend-dev, ...

# Test de SEO
echo '{"prompt":"audita el SEO de la pagina de inicio"}' | \
  node ~/.claude/scripts/hooks/game-master-router.js prompt 2>&1

# Debe mostrar:
# [GM-ROUTER] Dominios: seo
# [GM-ROUTER] Skills recomendadas: /seo
```

### Skills opcionales (recomendadas)

```bash
# Document skills (PDF, DOCX, PPTX, XLSX)
# Desde https://github.com/mrgoonie/claudekit-skills
cp -r claudekit-skills/.claude/skills/document-skills ~/.claude/skills/

# Mermaid.js v11 (diagramas)
cp -r claudekit-skills/.claude/skills/mermaidjs-v11 ~/.claude/skills/

# MCP Builder (crear MCP servers custom)
cp -r claudekit-skills/.claude/skills/mcp-builder ~/.claude/skills/

# Repomix (empaquetar repos para AI)
cp -r claudekit-skills/.claude/skills/repomix ~/.claude/skills/
```

### MCPs recomendados

```bash
# Context7 — docs live de 1000+ librerias
npx -y @anthropic-ai/claude-code mcp add context7 -- npx -y @upstash/context7-mcp@latest

# Tavily — busqueda web estructurada
npx -y @anthropic-ai/claude-code mcp add tavily -- npx -y tavily-mcp@latest
```

## Metricas

| Metrica | Valor |
|---|---|
| Dominios detectables | 30 |
| Keywords de deteccion | 276 |
| Skills/comandos ruteables | 80+ |
| Agentes con tool scoping | 11 |
| Hooks activos | 10 |
| Tiempo de routing | 72ms (99% es Node.js startup) |
| Tokens de routing | 0 |
| False positives | 0 |
| False negatives | 0 |
| Ahorro estimado vs opus-always | 3-5x |

## Licencia

MIT

## Autores

Anmol & Arnau
