---
name: "V3 Security Overhaul"
description: "Complete security architecture overhaul for claude-flow v3. Addresses critical CVEs (CVE-1, CVE-2, CVE-3) and implements secure-by-default patterns. Use for security-first v3 implementation."
---

# V3 Security Overhaul

## What This Skill Does

Orchestrates comprehensive security overhaul for claude-flow v3, addressing critical vulnerabilities and establishing security-first development practices using specialized v3 security agents.

## Quick Start

```bash
# Initialize V3 security domain (parallel)
Task("Security architecture", "Design v3 threat model and security boundaries", "v3-security-architect")
Task("CVE remediation", "Fix CVE-1, CVE-2, CVE-3 critical vulnerabilities", "security-auditor")
Task("Security testing", "Implement TDD London School security framework", "test-architect")
```

## Critical Security Fixes

### CVE-1: Vulnerable Dependencies
```bash
npm update @anthropic-ai/claude-code@^2.0.31
npm audit --audit-level high
```

### CVE-2: Weak Password Hashing
```typescript
// ❌ Old: SHA-256 with hardcoded salt
const hash = crypto.createHash('sha256').update(password + salt).digest('hex');

// ✅ New: bcrypt with 12 rounds
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);
```

### CVE-3: Hardcoded Credentials
```typescript
// ✅ Generate secure random credentials
const apiKey = crypto.randomBytes(32).toString('hex');
```

## Security Patterns

### Input Validation (Zod)
```typescript
import { z } from 'zod';

const TaskSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().max(10000),
  agentType: z.enum(['security', 'core', 'integration'])
});
```

### Path Sanitization
```typescript
function securePath(userPath: string, allowedPrefix: string): string {
  const resolved = path.resolve(allowedPrefix, userPath);
  if (!resolved.startsWith(path.resolve(allowedPrefix))) {
    throw new SecurityError('Path traversal detected');
  }
  return resolved;
}
```

### Safe Command Execution
```typescript
import { execFile } from 'child_process';

// ✅ Safe: No shell interpretation
const { stdout } = await execFile('git', [userInput], { shell: false });
```

## Success Metrics

- **Security Score**: 90/100 (npm audit + custom scans)
- **CVE Resolution**: 100% of critical vulnerabilities fixed
- **Test Coverage**: >95% security-critical code
- **Implementation**: All secure patterns documented and tested

---

## Practical Security Checklists (from ECC)

### When to Activate
- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Implementing payment features
- Storing or transmitting sensitive data

### Secrets Management
```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables + validation
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
```

### Authentication & Authorization
```typescript
// NEVER: localStorage for tokens (XSS vulnerable)
localStorage.setItem('token', token)

// ALWAYS: httpOnly cookies
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
```

### SQL Injection Prevention
```typescript
// NEVER: String concatenation
const query = `SELECT * FROM users WHERE email = '${userEmail}'`

// ALWAYS: Parameterized queries
const { data } = await supabase.from('users').select('*').eq('email', userEmail)
```

### XSS Prevention
```typescript
import DOMPurify from 'isomorphic-dompurify'
const clean = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
  ALLOWED_ATTR: []
})
```

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit'
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
app.use('/api/', limiter)
```

### Pre-Deployment Checklist
- [ ] No hardcoded secrets, all in env vars
- [ ] All user inputs validated (Zod schemas)
- [ ] All queries parameterized
- [ ] User content sanitized (DOMPurify)
- [ ] CSRF protection enabled
- [ ] Tokens in httpOnly cookies
- [ ] Role-based authorization checks
- [ ] Rate limiting on all endpoints
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] No sensitive data in errors or logs
- [ ] Dependencies up to date (npm audit clean)
- [ ] Row Level Security enabled (Supabase)
- [ ] File uploads validated (size, type)

### Security Testing Examples
```typescript
test('requires authentication', async () => {
  const response = await fetch('/api/protected')
  expect(response.status).toBe(401)
})

test('rejects invalid input', async () => {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' })
  })
  expect(response.status).toBe(400)
})
```