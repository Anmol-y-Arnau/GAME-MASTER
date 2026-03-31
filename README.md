# Game Master

**Director de Orquesta de nivel ejecutivo para Claude Code.** Analiza solicitudes complejas, las descompone en tareas y delega a sub-agentes especializados, skills y herramientas MCP. Incluye un sistema anti-alucinacion de 4 capas que fuerza verificacion factual en cada respuesta.

## Que es Game Master

Game Master no es un asistente generico. Es un **estratega, planificador y enrutador** que conoce todo el ecosistema de herramientas disponibles y decide cual usar para cada tarea. No resuelve problemas por fuerza bruta: los descompone y **delega obligatoriamente** al agente mas capacitado.

**Tiene prohibido** escribir codigo directamente, revisar codigo el mismo, o tomar decisiones de arquitectura sin delegar al especialista correspondiente.

### Ecosistema que orquesta

| Componente | Cantidad | Descripcion |
|---|---|---|
| **Agentes** | 115 | 8 root (chief-of-staff, reviewers) + 107 Ruflo (core, consensus, github, sparc, swarm, v3...) |
| **Skills** | 140 | Superpowers, debugging, search, context, design, SEO, WebKit, Anthropic skills |
| **Slash Commands** | 236 | 68 root + 168 Ruflo (sparc, swarm, github, hive-mind, automation...) |
| **MCP Servers** | 2 | Ruflo (259+ tools: memoria, swarms, agentdb, browser, workflows) + 21st.dev Magic |
| **Rules** | 12 sets | common + 11 lenguajes (typescript, python, golang, rust, kotlin, swift, cpp, java, php, perl, csharp) |
| **Hooks** | 29 | Automatizacion post-edit, pre-task, session management |
| **Modes** | 34 | 30 idiomas + especializados (email, law, chill) |
| **CLI Tools** | skill-seekers v3.4.0 | 30+ comandos para convertir docs/repos/PDFs/videos en skills |

## Skills Prioritarias

### Superpowers (14 skills)
Sistema completo de desarrollo: brainstorming, planning, execution, TDD, code review, verification, git worktrees, skill creation.

### Debugging
- `superpowers-systematic-debugging` — 4 fases: observar, hipotesis, probar, confirmar
- `showcase-systematic-debugging` — Root cause analysis + defense-in-depth

### File Search
- `smart-explore` — Busqueda estructural por AST (tree-sitter)
- `search-first` — Investigar antes de codificar

### Context Optimizer
- `context-budget` — Auditar consumo de contexto
- `context-engineering` — Patrones de ingenieria de contexto

### Skill Creator
- `anthropic-skill-creator` — Crear y evaluar skills con benchmarks
- `skill-builder` — Generar SKILL.md desde git history
- `skill-seekers` CLI — Convertir cualquier fuente en skill

### Design & Frontend (Anthropic Official)
- `frontend-design` — Interfaces production-grade
- `canvas-design` — Arte visual + 30 familias tipograficas
- `web-artifacts-builder` — Artefactos HTML multi-componente + shadcn
- `theme-factory` — 10 temas visuales
- `algorithmic-art` — Arte algoritmico con p5.js

### SEO (14 comandos)
Suite completa: `/seo`, `/seo-audit`, `/seo-fix`, `/seo-meta`, `/seo-headings`, `/seo-images`, `/seo-schema`, `/seo-content`, `/seo-keywords`, `/seo-speed`, `/seo-crawl`, `/seo-structure`, `/seo-compare`, `/seo-report`

### WebKit (9 skills)
Toolkit web completo: `building-components`, `chrome-bridge-automation`, `humanizer`, `playwright-cli`, `shadcn-ui`, `vercel-deploy`, `vercel-react-best-practices`, `web-design-guidelines`, `web-reader`

## Sistema Anti-Alucinacion (4 Capas)

La diferencia principal de Game Master frente a un agente generico. Cada capa se aplica obligatoriamente en toda respuesta.

### Capa 1: Ground Truth
Verificar con herramienta ANTES de afirmar cualquier cosa.
- Archivos: `Read`, `Grep`, `Glob`
- Librerias/APIs: `docs-lookup` (Context7)
- Paquetes: `Bash` (npm/pip info)
- Repo: `gh api` (nunca asumir contenido)
- Hechos: `WebSearch`

> Si no puedes verificar, di "No puedo confirmar esto"

### Capa 2: Confidence Scoring
Cada afirmacion lleva un nivel de certeza:

| Nivel | Significado |
|---|---|
| `[VERIFICADO]` | Confirmado con herramienta en esta sesion |
| `[ALTA]` | Basado en docs leidas o codigo verificado |
| `[MEDIA]` | Conocimiento del modelo, no verificado |
| `[BAJA]` | Suposicion, requiere verificacion |
| `[DESCONOCIDO]` | Sin informacion suficiente — no se inventa |

> URLs, versiones, flags de CLI y nombres de API son siempre [VERIFICADO] o [DESCONOCIDO]. No hay termino medio.

### Capa 3: Santa Method (Verificacion Cruzada)
Para tareas de alto riesgo, 2 revisores independientes en paralelo:

```
GENERATOR (Agente A) → produce entregable
REVIEWER B → precision factual
REVIEWER C → completitud y edge cases
VERDICT GATE → ambos pasan = NICE, cualquiera falla = NAUGHTY (corregir)
```

Se activa en: produccion, seguridad, pagos, auth, estadisticas, documentacion tecnica.

### Capa 4: Validacion Post-Ejecucion
No se declara tarea completada sin evidencia fresca:

```
1. IDENTIFY → que comando prueba la afirmacion?
2. RUN → ejecutar completo
3. READ → leer salida, verificar exit code
4. VERIFY → confirma la afirmacion?
5. SOLO ENTONCES → hacer la afirmacion con evidencia
```

### 10 Reglas Absolutas
1. NUNCA inventar URLs
2. NUNCA inventar nombres de funciones, flags o parametros
3. NUNCA inventar versiones de paquetes
4. NUNCA asumir contenido de archivos
5. NUNCA asumir que un comando existe
6. NUNCA decir "deberia funcionar" sin ejecutar
7. NUNCA presentar conocimiento del modelo como hecho verificado
8. Si no sabes, di "No lo se, puedo verificarlo con [herramienta]"
9. Verificar muestra de datos de sub-agentes antes de presentarlos
10. Preferir "no estoy seguro" a estar equivocado

## Sistema de Delegacion Inteligente

### 4 Niveles de Complejidad

Cada tarea se clasifica antes de activar triggers, para escalar los recursos proporcionalmente:

| Nivel | Descripcion | Agentes | Tokens estimados |
|---|---|---|---|
| **N1 Trivial** | 1-10 lineas, 1 archivo, mecanico (typo, string, CSS) | 0 | ~20-40K |
| **N2 Simple** | 10-50 lineas, 1-2 archivos, logica directa | 1-2 | ~50-100K |
| **N3 Moderado** | 50-200 lineas, 2-5 archivos, con dependencias | 3-5 | ~100-200K |
| **N4 Complejo** | >200 lineas, >5 archivos, arquitectura | 6-10 | ~200-400K |

### 13 Auto-Triggers con Umbrales

Los triggers se activan segun el nivel. No dispara la cadena completa para tareas triviales.

| Trigger | N1 | N2 | N3 | N4 |
|---|---|---|---|---|
| **CODE** | Directo | `coder` | `coder` + especialista | `coder` + especialista |
| **TEST** | No | 1-2 tests | Suite proporcional | TDD completo |
| **REVIEW** | No | Ligero | `reviewer` | `reviewer` + `code-analyzer` |
| **PLAN** | No | No | Si >3 pasos | SIEMPRE |
| **ARCH** | No | No | Si nuevo modulo | SIEMPRE |
| **SECURITY** | No | Solo si auth/SQL | Si aplica | SIEMPRE |
| **DB** | No | No | Si schema/queries | `database-specialist` |
| **PERF** | No | No | Si queries/loops | `performance-optimizer` |
| **UI** | No | Skill puntual | `frontend-design` | + `ui-ux-pro-max` |
| **RESEARCH** | No | Si libreria nueva | `search-first` | + `researcher` + `docs-lookup` |
| **DEBUG** | Fix directo | Si no obvio | SIEMPRE | SIEMPRE |

### Cadenas segun Nivel

```
N1: CODE directo → verificacion basica
N2: RESEARCH? → CODE (coder) → TEST (1-2) → review ligero
N3: PLAN? → RESEARCH → CODE → TEST (suite) → REVIEW → SECURITY?
N4: PLAN → ARCH → RESEARCH → CODE → TEST (TDD) → REVIEW+SECURITY+PERF (paralelo)
```

**Codigo sin tests = incompleto (N2+). Codigo sin review = incompleto (N3+). Sin excepciones.**

### Optimizaciones de Tokens

1. **Agrupar reviews** — Un `reviewer` para todos los archivos, no uno por archivo
2. **Skip research si verificado** — No relanzar si ya se verifico en esta sesion
3. **Reusar contexto** — Si `planner` analizo arquitectura, no lanzar `architect` para lo mismo
4. **Tests proporcionales** — N2: happy path. N3: + edge cases. N4: TDD completo
5. **Paralelismo SIEMPRE** — Agentes independientes van en paralelo

### Reporte de Orquestacion

Cada respuesta incluye metricas de eficiencia:

```
Nivel: N3 (moderado)
Agentes usados: 3 de 4 requeridos
Tokens estimados: ~120K
Triggers activados: CODE, TEST, REVIEW
Triggers omitidos: SECURITY (no toca auth/input)
```

## Flujo de Trabajo (6 pasos)

```
1. ANALISIS + DETECCION DE TRIGGERS
   Que pide el usuario? Que auto-triggers se activan?
   Listar explicitamente agentes que se van a convocar
          |
2. RESEARCH + GROUND TRUTH (Capa 1)
   Delegar a researcher + search-first + docs-lookup
          |
3. PLAN CON DELEGACION EXPLICITA (Capa 2)
   Delegar a planner. Cada paso con agente asignado
   Verificar que cadena PLAN→CODE→TEST→REVIEW esta presente
          |
4. EJECUCION CON CADENA COMPLETA
   4a. architect (si ARCH) → 4b. coder → 4c. tester (OBLIGATORIO)
   4d. reviewer + security + perf (EN PARALELO)
   4e. database-specialist (si DB) → 4f. UI skills (si UI)
          |
5. VALIDACION POST-EJECUCION (Capa 4)
   Verificacion fresca. Todos los triggers atendidos?
          |
6. REPORTE DE ORQUESTACION
   Tabla de agentes, resultados, trazabilidad, tasa de utilizacion
```

## Instalacion

### Requisitos previos
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) instalado
- [instalciones-optimizadas](https://github.com/Anmol-y-Arnau/instalciones-optimizadas) instalado (agentes, skills, commands, rules)
- Ruflo MCP configurado globalmente en `~/.claude.json`
- `skill-seekers` instalado (`pipx install skill-seekers`)

### Instalar Game Master

```bash
# Copiar el agente a tu directorio global de agentes
cp game-master.md ~/.claude/agents/game-master.md
```

### Verificar instalacion

```bash
# Debe aparecer game-master.md
ls ~/.claude/agents/game-master.md

# Verificar que Ruflo MCP es global
cat ~/.claude.json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('mcpServers',{}), indent=2))"
```

## Uso

### Desde cualquier chat de Claude Code

Pide a Claude que use el Game Master:

```
> Usa el agente game-master para planificar la arquitectura de mi app
> game-master: necesito crear un pipeline de CI/CD
> Delega esto al game-master
```

### Invocacion directa como sub-agente

Claude lo selecciona automaticamente cuando detecta tareas complejas multi-paso que requieren coordinacion estrategica.

### Funciona globalmente

Todos los recursos del Game Master son globales:
- Agente: `~/.claude/agents/game-master.md`
- Skills: `~/.claude/skills/` (140)
- Commands: `~/.claude/commands/` (236)
- MCP: `~/.claude.json` (Ruflo + 21st.dev)
- Rules: `~/.claude/rules/` (12 sets)
- CLI: `skill-seekers` en PATH

No hay dependencias a nivel de proyecto. Funciona en cualquier directorio.

## Repositorio de Referencia

Game Master usa [instalciones-optimizadas](https://github.com/Anmol-y-Arnau/instalciones-optimizadas) como fuente de verdad. Ese repo contiene 818 archivos: todos los agentes, skills, commands, rules, hooks, scripts y configuraciones que el Game Master puede consultar y delegar.

## Licencia

MIT

## Autores

- Anmol & Arnau
