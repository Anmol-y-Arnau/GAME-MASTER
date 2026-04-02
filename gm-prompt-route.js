#!/usr/bin/env node
/**
 * Game Master Prompt Router Hook
 * Pre-routes every user prompt with deterministic logic (0 tokens).
 * Outputs routing decisions to stderr so Claude sees them as context.
 */

const { execSync } = require('child_process');
const path = require('path');

const ROUTER = path.join(__dirname, 'game-master-router.js');

let input = '';
const chunks = [];

process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  input = Buffer.concat(chunks).toString();

  try {
    const result = execSync(`node "${ROUTER}" prompt`, {
      input,
      timeout: 3000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Router outputs routing to stderr, pass it through
    if (result) {
      process.stderr.write(result);
    }
  } catch (e) {
    // If router wrote to stderr before failing, capture it
    if (e.stderr) {
      process.stderr.write(e.stderr);
    }
    // Fail silently — don't block prompt
  }

  process.exit(0);
});
