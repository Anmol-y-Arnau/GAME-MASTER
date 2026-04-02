# Game Master

**Orquestador hibrido (codigo + LLM) para Claude Code.** Routing determinista en JavaScript (0 tokens) + ejecucion creativa via LLM. Delega a sub-agentes, skills, MCP y gstack commands seleccionando siempre la herramienta optima para cada tarea.

## Arquitectura

```
Usuario escribe prompt
        |
   game-master-router.js  (JavaScript, 0 tokens, <3ms)
   ├── Detecta stack del proyecto
   ├── Clasifica complejidad (N1-N4)
   ├── Detecta dominios (15 categorias)
   ├── Activa triggers (13 tipos)
   └── Selecciona agentes, skills, gstack commands, MCPs
        |
   [GM-ROUTER] lineas inyectadas en contexto
        |
   Game Master LLM  (solo ejecucion creativa)
   ├── Lee las recomendaciones del router
   ├── NO recalcula — sigue las decisiones del router
   ├── Delega a los agentes recomendados
   └── Aplica 4 capas anti-alucinacion
```

**Por que hibrido?** Un prompt de 200 lineas que le dice al LLM "elige la mejor herramienta" gasta ~4K tokens y falla el 20-40% del tiempo. El mismo routing en JavaScript es gratis, determinista y no falla.

## Archivos

| Archivo | Tipo | Funcion |
|---|---|---|
| `game-master.md` | Agente Claude Code | Instrucciones del Game Master (LLM) |
| `game-master-router.js` | Script Node.js | Logica de routing determinista |
| `gm-session-start.js` | Hook SessionStart | Detecta stack una vez por sesion |
| `gm-prompt-route.js` | Hook UserPromptSubmit | Pre-enruta cada prompt del usuario |

## Ecosistema que orquesta

| Componente | Cantidad |
|---|---|
| **Agentes** | 115+ (root + Ruflo) |
| **Skills** | 170+ (incluye gstack 33 skills) |
| **MCP Servers** | 6 (Ruflo, 21st.dev, Context7, Tavily, Excel, TaskMaster) |
| **Slash Commands** | 250+ (root + Ruflo + SEO + gstack) |
| **Rules** | 12 sets (common + 11 lenguajes) |

## Cobertura del Router

### 12 Stacks detectados automaticamente

TypeScript, Next.js, React, Python, Go, Rust, Flutter/Dart, Kotlin, C++, Swift, PHP, Java — detectados via `package.json`, `tsconfig.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc.

### 15 Dominios con routing directo

| Dominio | Agente | Skills / gstack |
|---|---|---|
| Base de datos | `database-specialist` | `database-migrations` |
| Seguridad | `security-auditor` | `security-scan`, `/cso` |
| Frontend / UI | `typescript-specialist` | `frontend-design`, `ui-ux-pro-max`, `/design-review` |
| Backend / API | `backend-dev` | `backend-patterns`, `api-design` |
| Testing | `tester` | `tdd-workflow`, `/qa` |
| Deploy / CI/CD | `cicd-engineer` | `vercel-deploy`, `/ship` |
| SEO | — | `/seo-audit` (14 comandos) |
| Rendimiento | `performance-optimizer` | `performance-analysis` |
| Documentacion | `docs-lookup` | `documentation-lookup` |
| Diseno visual | — | `canvas-design`, `theme-factory` |
| Browser | — | `/browse`, `chrome-bridge-automation` |
| Review | `reviewer` + `code-analyzer` | `/review` |
| Planificacion | `planner` + `architect` | `make-plan`, `/plan-ceo-review` |
| Excel | — | MCP `excel-mcp-server` |
| Git / GitHub | `pr-manager` | — |

### 4 Niveles de complejidad

| Nivel | Agentes | Tokens | Cadena |
|---|---|---|---|
| **N1 Trivial** | 0 | ~20-40K | Directo → verificar |
| **N2 Simple** | 1-2 | ~50-100K | coder → tests → verificar |
| **N3 Moderado** | 3-5 | ~100-200K | planner → coder → tests → review → verificar |
| **N4 Complejo** | 6-10 | ~200-400K | planner → architect → coder (TDD) → review+security+perf (paralelo) → verificar |

### 13 Triggers automaticos

CODE, TEST, REVIEW, PLAN, ARCH, SECURITY, DB, UI, DEPLOY, RESEARCH, DEBUG, PERF, DOCS — activados segun nivel y dominios detectados.

## Sistema Anti-Alucinacion (4 capas)

1. **Ground Truth** — verificar con herramienta antes de afirmar
2. **Confidence Scoring** — [VERIFICADO] / [ALTA] / [MEDIA] / [BAJA] / [DESCONOCIDO]
3. **Santa Method** — 2 revisores independientes para alto riesgo
4. **Validacion Post-Ejecucion** — evidencia fresca antes de cerrar tarea

## Instalacion

### Requisitos

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Node.js](https://nodejs.org/) v18+
- [instalciones-optimizadas](https://github.com/Anmol-y-Arnau/instalciones-optimizadas) instalado
- Ruflo MCP global en `~/.claude.json`

### Instalar

```bash
# 1. Copiar agente
cp game-master.md ~/.claude/agents/game-master.md

# 2. Copiar scripts de routing
cp game-master-router.js ~/.claude/scripts/hooks/game-master-router.js
cp gm-session-start.js ~/.claude/scripts/hooks/gm-session-start.js
cp gm-prompt-route.js ~/.claude/scripts/hooks/gm-prompt-route.js

# 3. Registrar hooks en ~/.claude/settings.json
# Anadir a "SessionStart":
#   { "hooks": [{ "type": "command", "command": "node ~/.claude/scripts/hooks/gm-session-start.js", "timeout": 5 }] }
# Anadir a "UserPromptSubmit":
#   { "hooks": [{ "type": "command", "command": "node ~/.claude/scripts/hooks/gm-prompt-route.js", "timeout": 3 }] }
```

### Verificar

```bash
# Test routing
echo '{"prompt":"crea un endpoint de autenticacion con JWT"}' | node ~/.claude/scripts/hooks/game-master-router.js prompt 2>&1

# Debe mostrar:
# [GM-ROUTER] Nivel: N3
# [GM-ROUTER] Dominios: backend, security
# [GM-ROUTER] Agentes: backend-dev, security-auditor, tester, reviewer
```

## MCPs Globales

| MCP | Funcion |
|---|---|
| `@21st-dev/magic` | Componentes UI |
| `ruflo` | 259+ tools (memoria, swarms, agentdb, browser, workflows) |
| `context7` | Docs live de 500+ librerias |
| `tavily` | Busqueda web estructurada + crawl + extract |
| `excel-mcp-server` | Manipulacion de Excel |
| `taskmaster-ai` | PRD → tareas con dependencias |

## Licencia

MIT

## Autores

Anmol & Arnau
