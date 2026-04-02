#!/usr/bin/env node
/**
 * Game Master Session Start Hook
 * Detects project stack and injects routing context into Claude's session.
 * Runs once at session start — zero tokens for routing thereafter.
 */

const { execSync } = require('child_process');
const path = require('path');

const ROUTER = path.join(__dirname, 'game-master-router.js');

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

process.exit(0);
