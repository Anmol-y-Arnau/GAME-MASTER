#!/usr/bin/env node
/**
 * Game Master Session Start Hook
 * 1. Detects project stack and injects routing context into Claude's session.
 * 2. Generates skill/agent index for dynamic discovery.
 * Runs once at session start — zero tokens for routing thereafter.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

const ROUTER = path.join(__dirname, 'game-master-router.js');
const INDEXER = path.join(__dirname, 'gm-skill-index.js');

// 1. Stack detection
try {
  const result = execSync(`node "${ROUTER}" session-start`, {
    timeout: 5000,
    encoding: 'utf8',
    env: { ...process.env, PROJECT_DIR: process.cwd() },
  });

  const parsed = JSON.parse(result);
  if (parsed.additionalContext) {
    process.stderr.write(parsed.additionalContext + '\n');
  }
} catch (e) {
  // Fail silently — don't block session start
}

// 1.5 Computer Executor Memory Injection
try {
  const fs = require('fs');
  const memoryDir = path.join(__dirname, 'memory');
  let memoryContext = '\n[COMPUTER EXECUTOR MEMORY]\n';
  const files = ['capabilities.md', 'permissions.md'];
  for (const file of files) {
    const filePath = path.join(memoryDir, file);
    if (fs.existsSync(filePath)) {
      memoryContext += `\n--- ${file} ---\n` + fs.readFileSync(filePath, 'utf8') + '\n';
    }
  }
  process.stderr.write(memoryContext + '\n');
} catch (e) {
  // Fail silently
}

// 2. Skill/agent index generation
try {
  const r = spawnSync('node', [INDEXER], {
    timeout: 5000,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (r.stderr) process.stderr.write(r.stderr);
} catch (e) {
  // Fail silently
}

process.exit(0);
