#!/usr/bin/env node
/**
 * Game Master Hybrid Router
 *
 * Deterministic routing logic that runs BEFORE the LLM processes.
 * Zero tokens for routing decisions — it's code, not prompt.
 *
 * Used by two hooks:
 *   1. SessionStart → detectStack() — detects project stack once
 *   2. UserPromptSubmit → routePrompt() — classifies and pre-routes each prompt
 */

const fs = require('fs');
const path = require('path');

// ─── Stack Detection (deterministic, runs once at session start) ───

const STACK_SIGNATURES = [
  { files: ['tsconfig.json', 'tsconfig.base.json'], stack: 'typescript', agent: 'typescript-specialist', skills: ['vercel-react-best-practices', 'frontend-patterns'] },
  { files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], stack: 'nextjs', agent: 'typescript-specialist', skills: ['vercel-react-best-practices', 'nextjs-turbopack'] },
  { files: ['pyproject.toml', 'setup.py', 'requirements.txt'], stack: 'python', agent: 'python-specialist', skills: ['python-patterns', 'python-testing'] },
  { files: ['go.mod'], stack: 'golang', agent: 'coder', skills: ['golang-patterns', 'golang-testing'] },
  { files: ['Cargo.toml'], stack: 'rust', agent: 'coder', skills: ['rust-patterns', 'rust-testing'] },
  { files: ['pubspec.yaml'], stack: 'flutter', agent: 'flutter-reviewer', skills: ['flutter-dart-code-review'] },
  { files: ['build.gradle.kts', 'build.gradle'], stack: 'kotlin', agent: 'kotlin-reviewer', skills: ['kotlin-patterns'] },
  { files: ['CMakeLists.txt'], stack: 'cpp', agent: 'cpp-reviewer', skills: ['cpp-coding-standards'] },
  { files: ['Package.swift'], stack: 'swift', agent: 'coder', skills: ['swift-concurrency-6-2'] },
  { files: ['composer.json'], stack: 'php', agent: 'coder', skills: ['laravel-patterns'] },
  { files: ['Gemfile'], stack: 'ruby', agent: 'coder', skills: [] },
  { files: ['pom.xml'], stack: 'java', agent: 'coder', skills: ['java-coding-standards', 'springboot-patterns'] },
];

function detectStack(cwd) {
  const detected = [];
  for (const sig of STACK_SIGNATURES) {
    for (const f of sig.files) {
      const fullPath = path.join(cwd, f);
      if (fs.existsSync(fullPath)) {
        detected.push(sig);
        break;
      }
    }
  }
  // Check for React/Next.js in package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['next']) {
        const existing = detected.find(d => d.stack === 'nextjs');
        if (!existing) detected.push(STACK_SIGNATURES.find(s => s.stack === 'nextjs'));
      }
      if (deps['react'] && !deps['next']) {
        detected.push({ stack: 'react', agent: 'typescript-specialist', skills: ['frontend-patterns', 'vercel-react-best-practices'] });
      }
      if (deps['supabase'] || deps['@supabase/supabase-js']) {
        detected.push({ stack: 'supabase', agent: 'database-specialist', skills: ['database-migrations'] });
      }
      if (deps['prisma'] || deps['@prisma/client']) {
        detected.push({ stack: 'prisma', agent: 'database-specialist', skills: ['database-migrations'] });
      }
    } catch (e) { /* ignore parse errors */ }
  }
  return detected.length > 0 ? detected : [{ stack: 'unknown', agent: 'coder', skills: [] }];
}

// ─── Complexity Classification (deterministic) ───

function classifyComplexity(prompt) {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/).length;

  // N1 Trivial signals
  const trivialPatterns = [
    /^(cambia|change|rename|fix typo|arregla|corrige)\s/,
    /version/i, /--version/, /que version/i, /what version/i,
    /^ls\b/, /^cat\b/, /^pwd\b/,
  ];
  if (words < 15 && trivialPatterns.some(p => p.test(lower))) return 'N1';

  // N4 Complex signals
  const complexPatterns = [
    /refactor(iza|ear|ing)?\s.*(modulo|module|sistema|system|completo|complete)/i,
    /arquitectura|architecture/i,
    /migra(cion|tion|r)\s.*(base de datos|database|schema)/i,
    /nuevo modulo|new module|nueva feature completa/i,
    /\b(critico|critical|produccion|production)\b/i,
    /audit(oria|oría)?\s.*(seguridad|security|completo|complete)/i,
    /\b(completo|complete|full)\s.*(audit|review|analisis|analysis)\b/i,
  ];
  if (complexPatterns.some(p => p.test(lower)) || words > 100) return 'N4';

  // N3 Moderate signals
  const moderatePatterns = [
    /endpoint|api\s|componente|component/i,
    /crud|tabla|table|migracion|migration/i,
    /integr(a|e)/i,
    /\b(crea|create|implementa|implement|build|construye)\b.*\b(sistema|system|servicio|service|modulo|module)\b/i,
  ];
  if (moderatePatterns.some(p => p.test(lower)) || words > 40) return 'N3';

  // Default N2 Simple
  return 'N2';
}

// ─── Domain Detection (deterministic) ───

const DOMAIN_KEYWORDS = {
  database: { keywords: ['database', 'db', 'schema', 'migration', 'query', 'sql', 'tabla', 'base de datos', 'prisma', 'supabase'], agents: ['database-specialist'], skills: ['database-migrations'] },
  security: { keywords: ['auth', 'security', 'token', 'password', 'encrypt', 'vulnerability', 'owasp', 'seguridad', 'login', 'session'], agents: ['security-auditor'], skills: ['security-scan'], gstack: '/cso' },
  frontend: { keywords: ['ui', 'ux', 'frontend', 'component', 'css', 'layout', 'responsive', 'design', 'diseno', 'boton', 'button', 'pagina', 'page'], agents: ['typescript-specialist'], skills: ['frontend-design', 'ui-ux-pro-max', 'building-components'], gstack: '/design-review' },
  backend: { keywords: ['api', 'endpoint', 'server', 'rest', 'graphql', 'middleware', 'route', 'controller'], agents: ['backend-dev'], skills: ['backend-patterns', 'api-design'] },
  testing: { keywords: ['test', 'tdd', 'e2e', 'coverage', 'jest', 'vitest', 'playwright', 'qa'], agents: ['tester'], skills: ['tdd-workflow', 'e2e-testing'], gstack: '/qa' },
  deploy: { keywords: ['deploy', 'vercel', 'ci', 'cd', 'pipeline', 'docker', 'ship', 'release'], agents: ['cicd-engineer'], skills: ['vercel-deploy', 'deployment-patterns'], gstack: '/ship' },
  seo: { keywords: ['seo', 'meta tag', 'crawl', 'sitemap', 'robots', 'schema markup', 'keywords'], agents: [], skills: [], commands: ['/seo-audit'] },
  performance: { keywords: ['performance', 'benchmark', 'optimize', 'slow', 'lento', 'rapido', 'cache', 'bundle'], agents: ['performance-optimizer'], skills: ['performance-analysis'] },
  documentation: { keywords: ['doc', 'readme', 'documentation', 'api doc', 'swagger', 'openapi'], agents: ['docs-lookup'], skills: ['documentation-lookup', 'api-design'] },
  design: { keywords: ['canvas', 'theme', 'art', 'typography', 'color', 'palette', 'visual', 'logo'], agents: [], skills: ['canvas-design', 'theme-factory', 'algorithmic-art', 'ui-ux-pro-max'] },
  browser: { keywords: ['browser', 'chrome', 'scrape', 'web page', 'navigate', 'screenshot'], agents: [], skills: ['chrome-bridge-automation'], gstack: '/browse' },
  review: { keywords: ['review', 'revisar', 'code review', 'pr review', 'pull request'], agents: ['reviewer', 'code-analyzer'], skills: [], gstack: '/review' },
  planning: { keywords: ['plan', 'planifica', 'roadmap', 'prd', 'requirements', 'spec'], agents: ['planner', 'architect'], skills: ['make-plan', 'blueprint'], gstack: '/plan-ceo-review' },
  excel: { keywords: ['excel', 'spreadsheet', 'xlsx', 'csv', 'pivot', 'chart'], agents: [], skills: [], mcp: 'excel-mcp-server' },
  git: { keywords: ['git', 'commit', 'branch', 'merge', 'pr', 'pull request', 'push'], agents: ['pr-manager'], skills: [] },
};

function detectDomains(prompt) {
  const lower = prompt.toLowerCase();
  const matched = [];
  for (const [domain, config] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const kw of config.keywords) {
      if (lower.includes(kw)) {
        matched.push({ domain, ...config });
        break;
      }
    }
  }
  return matched;
}

// ─── Trigger Activation (deterministic) ───

function activateTriggers(level, domains, prompt) {
  const triggers = [];
  const lower = prompt.toLowerCase();
  const hasSecurity = domains.some(d => d.domain === 'security');
  const hasDB = domains.some(d => d.domain === 'database');
  const hasUI = domains.some(d => d.domain === 'frontend' || d.domain === 'design');
  const hasTest = domains.some(d => d.domain === 'testing');
  const hasDeploy = domains.some(d => d.domain === 'deploy');

  // CODE — always when there's implementation work
  if (level !== 'N1' || lower.match(/\b(crea|create|implementa|implement|escribe|write|add|anade)\b/)) {
    triggers.push('CODE');
  }

  // TEST — N2+
  if (level !== 'N1') triggers.push('TEST');

  // REVIEW — N3+
  if (level === 'N3' || level === 'N4') triggers.push('REVIEW');

  // PLAN — N3 if >3 steps implied, N4 always
  if (level === 'N4') triggers.push('PLAN');
  if (level === 'N3' && lower.match(/\b(varios|multiple|steps|pasos|fases|phases)\b/)) triggers.push('PLAN');

  // ARCH — N4 always, N3 if new module
  if (level === 'N4') triggers.push('ARCH');
  if (level === 'N3' && lower.match(/\b(modulo|module|nuevo servicio|new service|nueva tabla|new table)\b/)) triggers.push('ARCH');

  // Domain-specific triggers
  if (hasSecurity) triggers.push('SECURITY');
  if (hasDB) triggers.push('DB');
  if (hasUI) triggers.push('UI');
  if (hasDeploy) triggers.push('DEPLOY');
  if (hasTest && !triggers.includes('TEST')) triggers.push('TEST');

  // RESEARCH — N3+
  if (level === 'N3' || level === 'N4') triggers.push('RESEARCH');

  return [...new Set(triggers)];
}

// ─── Main Router ───

function routePrompt(prompt, cwd) {
  const stacks = detectStack(cwd);
  const level = classifyComplexity(prompt);
  const domains = detectDomains(prompt);
  const triggers = activateTriggers(level, domains, prompt);

  // Collect unique agents
  const agents = new Set();
  const skills = new Set();
  const gstackCmds = new Set();
  const mcps = new Set();

  // From stack detection
  for (const s of stacks) {
    agents.add(s.agent);
    s.skills.forEach(sk => skills.add(sk));
  }

  // From domain detection
  for (const d of domains) {
    d.agents.forEach(a => agents.add(a));
    d.skills.forEach(s => skills.add(s));
    if (d.gstack) gstackCmds.add(d.gstack);
    if (d.mcp) mcps.add(d.mcp);
    if (d.commands) d.commands.forEach(c => gstackCmds.add(c));
  }

  // From triggers
  if (triggers.includes('TEST')) agents.add('tester');
  if (triggers.includes('REVIEW')) { agents.add('reviewer'); agents.add('code-analyzer'); }
  if (triggers.includes('PLAN')) agents.add('planner');
  if (triggers.includes('ARCH')) agents.add('architect');
  if (triggers.includes('SECURITY')) agents.add('security-auditor');
  if (triggers.includes('DB')) agents.add('database-specialist');

  return {
    level,
    stacks: stacks.map(s => s.stack),
    domains: domains.map(d => d.domain),
    triggers,
    agents: [...agents],
    skills: [...skills],
    gstack: [...gstackCmds],
    mcps: [...mcps],
  };
}

// ─── Hook Entry Points ───

function handleSessionStart() {
  const cwd = process.env.PROJECT_DIR || process.cwd();
  const stacks = detectStack(cwd);

  const context = [
    `[GAME-MASTER-ROUTER] Stack detectado: ${stacks.map(s => s.stack).join(', ')}`,
    `[GAME-MASTER-ROUTER] Agente primario: ${stacks[0].agent}`,
    `[GAME-MASTER-ROUTER] Skills recomendadas: ${stacks.flatMap(s => s.skills).join(', ') || 'ninguna especifica'}`,
    `[GAME-MASTER-ROUTER] Para CODE, usa siempre: ${stacks[0].agent} (no coder generico)`,
  ].join('\n');

  // Cache stack for UserPromptSubmit
  const cacheDir = path.join(process.env.HOME || '', '.gm-router');
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, 'stack.json'), JSON.stringify(stacks));
    fs.writeFileSync(path.join(cacheDir, 'cwd.txt'), cwd);
  } catch (e) { /* ignore */ }

  return context;
}

function handleUserPromptSubmit(input) {
  let prompt = '';
  try {
    const data = JSON.parse(input);
    prompt = data.prompt || data.content || data.message || '';
  } catch (e) {
    prompt = input || '';
  }

  if (!prompt || prompt.length < 5) return null;

  // Read cached CWD
  let cwd = process.cwd();
  try {
    const cachedCwd = path.join(process.env.HOME || '', '.gm-router', 'cwd.txt');
    if (fs.existsSync(cachedCwd)) cwd = fs.readFileSync(cachedCwd, 'utf8').trim();
  } catch (e) { /* ignore */ }

  const routing = routePrompt(prompt, cwd);

  // Skip routing for trivial/fast requests
  if (routing.level === 'N1' && routing.domains.length === 0) return null;

  const lines = [
    `[GM-ROUTER] Nivel: ${routing.level}`,
    `[GM-ROUTER] Stack: ${routing.stacks.join(', ')}`,
    routing.domains.length > 0 ? `[GM-ROUTER] Dominios: ${routing.domains.join(', ')}` : null,
    `[GM-ROUTER] Triggers: ${routing.triggers.join(', ') || 'ninguno'}`,
    `[GM-ROUTER] Agentes recomendados: ${routing.agents.join(', ')}`,
    routing.skills.length > 0 ? `[GM-ROUTER] Skills recomendadas: ${routing.skills.join(', ')}` : null,
    routing.gstack.length > 0 ? `[GM-ROUTER] gstack commands: ${routing.gstack.join(', ')}` : null,
    routing.mcps.length > 0 ? `[GM-ROUTER] MCPs especializadas: ${routing.mcps.join(', ')}` : null,
  ].filter(Boolean);

  // Log for analysis
  const logDir = path.join(process.env.HOME || '', '.gm-router');
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'routing.log'), JSON.stringify({
      ts: new Date().toISOString(),
      prompt: prompt.slice(0, 80),
      ...routing,
    }) + '\n');
  } catch (e) { /* ignore */ }

  return lines.join('\n');
}

// ─── CLI Entry ───

const mode = process.argv[2] || 'prompt';
let input = '';

if (process.stdin.isTTY) {
  // No stdin — use args
  if (mode === 'session-start') {
    const ctx = handleSessionStart();
    process.stdout.write(JSON.stringify({ additionalContext: ctx }));
  } else if (mode === 'detect-stack') {
    const cwd = process.argv[3] || process.cwd();
    console.log(JSON.stringify(detectStack(cwd), null, 2));
  } else if (mode === 'route') {
    const prompt = process.argv.slice(3).join(' ');
    console.log(JSON.stringify(routePrompt(prompt, process.cwd()), null, 2));
  }
} else {
  // Read from stdin (hook mode)
  const chunks = [];
  process.stdin.on('data', chunk => chunks.push(chunk));
  process.stdin.on('end', () => {
    input = Buffer.concat(chunks).toString();

    if (mode === 'session-start') {
      const ctx = handleSessionStart();
      process.stdout.write(JSON.stringify({ additionalContext: ctx }));
    } else if (mode === 'prompt') {
      const result = handleUserPromptSubmit(input);
      if (result) {
        process.stderr.write(result + '\n');
      }
    }

    process.exit(0);
  });
}
