#!/usr/bin/env node
/**
 * Game Master Prompt Router Hook
 * Pre-routes every user prompt with deterministic logic (0 tokens).
 * Outputs routing decisions to stderr so Claude sees them as context.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROUTER = path.join(__dirname, 'game-master-router.js');

let input = '';
const chunks = [];

process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  input = Buffer.concat(chunks).toString();

  try {
    // Use spawnSync to capture both stdout and stderr separately
    const result = spawnSync('node', [ROUTER, 'prompt'], {
      input,
      timeout: 3000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Router writes routing decisions to stderr — forward to Claude
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    // Also forward stdout in case router writes there
    if (result.stdout) {
      process.stderr.write(result.stdout);
    }
  } catch (e) {
    // Fail silently — don't block prompt
  }

  process.exit(0);
});
