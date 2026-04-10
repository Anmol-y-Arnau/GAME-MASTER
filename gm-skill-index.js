#!/usr/bin/env node
/**
 * Game Master Skill Indexer
 *
 * Scans all installed skills and agents, extracts name + description,
 * and generates a compact searchable index at ~/.gm-router/skill-index.txt
 *
 * Runs at session start (called by gm-session-start.js).
 * Game Master reads this file on-demand when the router doesn't match.
 * Cost: 0 tokens unless discovery is needed.
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR = path.join(process.env.HOME || '', '.claude');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const OUTPUT_DIR = path.join(process.env.HOME || '', '.gm-router');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'skill-index.txt');

// Skills already in game-master catalog (skip to avoid duplication)
const CATALOGED = new Set([
  'frontend-design', 'ui-ux-pro-max', 'building-components', 'backend-patterns',
  'api-design', 'database-migrations', 'security-scan', 'tdd-workflow', 'e2e-testing',
  'vercel-deploy', 'deployment-patterns', 'performance-analysis', 'documentation-lookup',
  'canvas-design', 'theme-factory', 'algorithmic-art', 'chrome-bridge-automation',
  'make-plan', 'blueprint', 'pdf', 'docx', 'pptx', 'xlsx', 'mermaidjs-v11',
  'mcp-builder', 'repomix', 'marketing-ideas', 'marketing-psychology',
  'content-strategy', 'launch-strategy', 'product-marketing-context', 'cold-email',
  'email-sequence', 'social-content', 'copywriting', 'ad-creative', 'paid-ads',
  'sales-enablement', 'lead-magnets', 'referral-program', 'pricing-strategy',
  'revops', 'page-cro', 'form-cro', 'signup-flow-cro', 'onboarding-cro',
  'popup-cro', 'paywall-upgrade-cro', 'churn-prevention', 'ab-test-setup',
  'article-writing', 'content-engine', 'content-research-writer', 'humanizer',
  'deep-research', 'exa-search', 'market-research', 'competitor-alternatives',
  'customer-research', 'video-editing', 'ffmpeg', 'remotion-best-practices',
  'remotion-render', 'motion-designer', 'fal-ai-media', 'explainer-video-guide',
  'investigate', 'showcase-systematic-debugging', 'design-system',
  'design-consultation', 'design-shotgun', 'awwwards-animations', 'emil-design-eng',
  'design-html', 'ai-seo', 'analytics-tracking', 'programmatic-seo',
  'schema-markup', 'site-architecture', 'autoplan', 'pair-programming',
  'office-hours', 'product-lens', 'retro', 'team-builder',
  'codebase-onboarding', 'santa-method',
  'superpowers-brainstorming', 'superpowers-writing-plans',
  'superpowers-executing-plans', 'superpowers-dispatching-parallel-agents',
  'superpowers-verification-before-completion',
  'superpowers-test-driven-development', 'superpowers-subagent-driven-development',
  'superpowers-systematic-debugging', 'superpowers-receiving-code-review',
]);

function extractFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const fm = match[1];
    const name = (fm.match(/^name:\s*(.+)$/m) || [])[1]?.trim();
    const desc = (fm.match(/^description:\s*["']?(.+?)["']?\s*$/m) || [])[1]?.trim();
    return name && desc ? { name, desc } : null;
  } catch {
    return null;
  }
}

function scanSkills() {
  const results = [];
  if (!fs.existsSync(SKILLS_DIR)) return results;

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    const name = entry.name;
    if (CATALOGED.has(name)) continue;
    if (name.startsWith('.') || name === 'README.md') continue;

    // Check for SKILL.md in the skill directory
    const skillMdPath = path.join(SKILLS_DIR, name, 'SKILL.md');
    const indexMdPath = path.join(SKILLS_DIR, name, 'index.md');

    let info = null;
    if (fs.existsSync(skillMdPath)) {
      info = extractFrontmatter(skillMdPath);
    } else if (fs.existsSync(indexMdPath)) {
      info = extractFrontmatter(indexMdPath);
    }

    // For skills that are just directories with sub-skills (like document-skills)
    if (!info && entry.isDirectory()) {
      const subEntries = fs.readdirSync(path.join(SKILLS_DIR, name), { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isDirectory() && !CATALOGED.has(sub.name)) {
          const subSkillMd = path.join(SKILLS_DIR, name, sub.name, 'SKILL.md');
          if (fs.existsSync(subSkillMd)) {
            const subInfo = extractFrontmatter(subSkillMd);
            if (subInfo) results.push(subInfo);
          }
        }
      }
      continue;
    }

    if (info) {
      results.push(info);
    } else {
      // Fallback: use directory name as skill name
      results.push({ name, desc: '(no description)' });
    }
  }
  return results;
}

function scanAgents() {
  const results = [];
  if (!fs.existsSync(AGENTS_DIR)) return results;

  // Known agents already in game-master
  const knownAgents = new Set([
    'game-master', 'reviewer', 'code-reviewer', 'code-analyzer', 'analyst',
    'tester', 'tdd-guide', 'planner', 'architect', 'security-auditor',
    'coder', 'typescript-specialist', 'cicd-engineer',
  ]);

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const info = extractFrontmatter(fullPath);
        if (info && !knownAgents.has(info.name)) {
          results.push(info);
        }
      }
    }
  }

  walk(AGENTS_DIR);
  return results;
}

function buildIndex() {
  const skills = scanSkills();
  const agents = scanAgents();

  const lines = [
    `# Skill & Agent Index (auto-generated ${new Date().toISOString().split('T')[0]})`,
    `# Skills and agents NOT in game-master catalog. Use Skill tool to invoke skills.`,
    `# Game Master: read this file when the router doesn't match a domain.`,
    '',
    `## Skills (${skills.length} not in catalog)`,
    '',
  ];

  // Group skills by rough category based on name patterns
  const categories = {
    'Language-specific': [],
    'Framework-specific': [],
    'DevOps/Infra': [],
    'Code Quality': [],
    'Other': [],
  };

  for (const s of skills) {
    const n = s.name.toLowerCase();
    if (/kotlin|rust|cpp|perl|python|golang|go-|swift|java-|flutter/.test(n)) {
      categories['Language-specific'].push(s);
    } else if (/next|react|django|laravel|spring|shadcn|remotion|tailwind/.test(n)) {
      categories['Framework-specific'].push(s);
    } else if (/docker|deploy|cicd|vercel|canary|guard|safety|freeze/.test(n)) {
      categories['DevOps/Infra'].push(s);
    } else if (/review|test|lint|format|quality|health|eval|verify/.test(n)) {
      categories['Code Quality'].push(s);
    } else {
      categories['Other'].push(s);
    }
  }

  for (const [cat, items] of Object.entries(categories)) {
    if (items.length === 0) continue;
    lines.push(`### ${cat}`);
    for (const s of items) {
      // Truncate description to 80 chars
      const desc = s.desc.length > 80 ? s.desc.slice(0, 77) + '...' : s.desc;
      lines.push(`- ${s.name}: ${desc}`);
    }
    lines.push('');
  }

  if (agents.length > 0) {
    // Categorize agents for discoverability
    const agentCats = {
      'Language Reviewers (use for code review in specific languages)': [],
      'Build Resolvers (use when build/compilation fails)': [],
      'GitHub/PR (use for repo management, PRs, issues, releases)': [],
      'Architecture & Planning': [],
      'Research & Documentation': [],
      'ML/AI': [],
      'Communication': [],
      'Infrastructure (internal — rarely for user tasks)': [],
    };

    for (const a of agents) {
      const n = a.name.toLowerCase();
      const d = a.desc.toLowerCase();
      if (/reviewer/.test(n) && /cpp|kotlin|flutter|rust|python|go/.test(n)) {
        agentCats['Language Reviewers (use for code review in specific languages)'].push(a);
      } else if (/build-resolver|build.*resolver/.test(n)) {
        agentCats['Build Resolvers (use when build/compilation fails)'].push(a);
      } else if (/github|pr-|issue|release|swarm-pr|swarm-issue|sync-coord|workflow-auto|repo-|project-board|multi-repo/.test(n)) {
        agentCats['GitHub/PR (use for repo management, PRs, issues, releases)'].push(a);
      } else if (/architect|planner|goal|template|migration|spec/.test(n)) {
        agentCats['Architecture & Planning'].push(a);
      } else if (/research|docs|api-docs/.test(n)) {
        agentCats['Research & Documentation'].push(a);
      } else if (/ml-|neural|safla|sona|pytorch/.test(n)) {
        agentCats['ML/AI'].push(a);
      } else if (/chief|staff/.test(n)) {
        agentCats['Communication'].push(a);
      } else if (/byzantine|raft|crdt|gossip|quorum|consensus|trading|matrix|pagerank|payment|mesh|adaptive|hierarchical|swarm-memory|collective|worker-spec|scout|queen|codex|dual-orch|load-balan|resource-alloc|benchmark-suite|topology|performance-monitor|performance-bench|security-manager|flow-nexus|hive-mind|v3-/.test(n)) {
        agentCats['Infrastructure (internal — rarely for user tasks)'].push(a);
      } else {
        agentCats['Architecture & Planning'].push(a);
      }
    }

    lines.push(`## Agents (${agents.length} not in catalog)`);
    lines.push('');
    for (const [cat, items] of Object.entries(agentCats)) {
      if (items.length === 0) continue;
      lines.push(`### ${cat}`);
      for (const a of items) {
        const desc = (a.desc && a.desc !== '|' && a.desc.length > 1)
          ? (a.desc.length > 80 ? a.desc.slice(0, 77) + '...' : a.desc)
          : '(see agent definition for details)';
        lines.push(`- ${a.name}: ${desc}`);
      }
      lines.push('');
    }
  }

  try {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));
  } catch (e) {
    // Fail silently
  }

  return { skillCount: skills.length, agentCount: agents.length };
}

// Run
if (require.main === module) {
  const result = buildIndex();
  // Output count for session-start context
  process.stderr.write(`[GM-INDEX] Indexed ${result.skillCount} skills + ${result.agentCount} agents not in catalog → ~/.gm-router/skill-index.txt\n`);
}

module.exports = { buildIndex };
