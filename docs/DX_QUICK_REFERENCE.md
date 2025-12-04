# DX Patterns - Quick Reference Guide
## Enzyme CLI Implementation Checklist

> **Purpose**: Quick reference for developers implementing DX improvements. For full details, see `DX_IMPROVEMENT_PLAN.md`.

---

## Quick Wins (Do These First) ⚡

### 1. Command Suggestions (1 day) 🔴 HIGH ROI

```typescript
// Add to /cli/src/index.ts
import { distance } from 'fastest-levenshtein';

program.on('command:*', (operands) => {
  const unknownCommand = operands[0];
  const availableCommands = program.commands.map(cmd => cmd.name());
  const suggestions = availableCommands
    .map(cmd => ({ command: cmd, distance: distance(unknownCommand, cmd) }))
    .filter(item => item.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.command);

  logger.error(`Unknown command: ${unknownCommand}`);
  if (suggestions.length > 0) {
    logger.info('Did you mean one of these?');
    suggestions.forEach(s => logger.info(`  ${s}`));
  }
  process.exit(1);
});
```

**Dependencies**: `npm install fastest-levenshtein`
**Test**: `enzyme generaet` → suggests "generate"

---

### 2. Better Error Messages (2 days) 🔴 HIGH ROI

```typescript
// Create /cli/src/utils/errors.ts
export class EnzymeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string[],
    public suggestions?: string[],
    public docLink?: string
  ) {
    super(message);
  }

  format(): string {
    const lines = [
      '',
      chalk.red.bold(`✖ ${this.message}`),
      '',
    ];

    if (this.details?.length) {
      lines.push(chalk.gray('Details:'));
      this.details.forEach(d => lines.push(chalk.gray(`  • ${d}`)));
      lines.push('');
    }

    if (this.suggestions?.length) {
      lines.push(chalk.yellow('Possible solutions:'));
      this.suggestions.forEach((s, i) => {
        lines.push(chalk.yellow(`  ${i + 1}. ${s}`));
      });
      lines.push('');
    }

    if (this.docLink) {
      lines.push(chalk.blue(`📚 Learn more: ${this.docLink}`));
    }

    return lines.join('\n');
  }
}

// Usage in commands:
if (fs.existsSync(path)) {
  throw new EnzymeError(
    `Component "${name}" already exists`,
    'COMPONENT_EXISTS',
    [`Found at: ${path}`],
    ['Use a different name', 'Use --force to overwrite'],
    'https://enzyme.dev/docs/errors/component-exists'
  );
}
```

---

### 3. Progress Indicators (2 days) 🔴 HIGH ROI

```typescript
// Enhance /cli/src/utils/logger.ts
export class Logger {
  progressBar(current: number, total: number, label: string): void {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 40);
    const bar = '█'.repeat(filled) + '░'.repeat(40 - filled);

    process.stdout.write(
      `\r${label} [${bar}] ${percentage}% (${current}/${total})`
    );

    if (current === total) {
      process.stdout.write('\n');
    }
  }

  taskList(tasks: Array<{
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    time?: number;
  }>): void {
    tasks.forEach(task => {
      const icon = {
        pending: chalk.gray('○'),
        running: chalk.cyan('⣾'),
        success: chalk.green('✓'),
        error: chalk.red('✖'),
      }[task.status];

      const time = task.time ? chalk.gray(` (${task.time}ms)`) : '';
      console.log(`  ${icon} ${task.name}${time}`);
    });
  }
}

// Usage:
logger.progressBar(3, 5, 'Installing dependencies');
```

---

### 4. Enhanced Prompts (2 days) 🔴 HIGH ROI

```typescript
// Add to /cli/src/utils/prompts.ts
import inquirer from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';

inquirer.registerPrompt('autocomplete', autocomplete);

export async function selectWithSearch(
  message: string,
  choices: string[]
): Promise<string> {
  const answer = await inquirer.prompt([
    {
      type: 'autocomplete',
      name: 'selection',
      message,
      source: async (_answers: any, input: string) => {
        if (!input) return choices;
        return choices.filter(c =>
          c.toLowerCase().includes(input.toLowerCase())
        );
      },
    },
  ]);

  return answer.selection;
}

// Usage:
const component = await selectWithSearch(
  'Select component to modify:',
  ['Button', 'Card', 'Header', 'Footer']
);
```

**Dependencies**: `npm install inquirer-autocomplete-prompt`

---

## Checklist: Phase 1 (Weeks 1-2)

### Week 1: Core Improvements

- [ ] **Day 1**: Command suggestions
  - [ ] Install `fastest-levenshtein`
  - [ ] Add fuzzy matching to CLI
  - [ ] Test with common typos
  - [ ] Update help text

- [ ] **Day 2-3**: Error messages
  - [ ] Create `EnzymeError` class
  - [ ] Add error codes
  - [ ] Create error factory functions
  - [ ] Update all error throws
  - [ ] Add documentation links

- [ ] **Day 4-5**: Interactive prompts
  - [ ] Install `inquirer-autocomplete-prompt`
  - [ ] Add fuzzy search to prompts
  - [ ] Enhance feature selection
  - [ ] Add directory picker
  - [ ] Test user flows

### Week 2: UX Polish

- [ ] **Day 6-7**: Progress indicators
  - [ ] Add progress bar helper
  - [ ] Add task list formatter
  - [ ] Update long-running commands
  - [ ] Add timing information
  - [ ] Test with slow operations

- [ ] **Day 8-9**: Help text
  - [ ] Add command grouping
  - [ ] Add visual hierarchy (box drawing)
  - [ ] Add examples to all commands
  - [ ] Create ASCII banner
  - [ ] Update `--help` output

- [ ] **Day 10**: Testing & Polish
  - [ ] Integration tests
  - [ ] Manual QA
  - [ ] Documentation updates
  - [ ] CHANGELOG updates

---

## Code Patterns

### Pattern: Spinner with Success/Failure

```typescript
// DO ✅
logger.startSpinner('Installing dependencies...');
try {
  await installDeps();
  logger.succeedSpinner('Dependencies installed (12.3s)');
} catch (error) {
  logger.failSpinner('Installation failed');
  throw error;
}

// DON'T ❌
console.log('Installing...');
await installDeps();
console.log('Done');
```

---

### Pattern: Multi-step Progress

```typescript
// DO ✅
const tasks = [
  { name: 'Creating files', status: 'pending' },
  { name: 'Installing deps', status: 'pending' },
  { name: 'Initializing git', status: 'pending' },
];

for (let i = 0; i < tasks.length; i++) {
  tasks[i].status = 'running';
  logger.taskList(tasks);

  await performTask(i);

  tasks[i].status = 'success';
  tasks[i].time = Date.now() - start;
  logger.taskList(tasks);
}

// DON'T ❌
await createFiles();
await installDeps();
await initGit();
console.log('Done');
```

---

### Pattern: Error with Suggestions

```typescript
// DO ✅
if (!isValidName(name)) {
  throw new EnzymeError(
    `Invalid component name: ${name}`,
    'INVALID_NAME',
    ['Component names must be PascalCase'],
    [
      `Try: ${toPascalCase(name)}`,
      'Use letters and numbers only',
      'Check the naming guide: enzyme docs naming'
    ],
    'https://enzyme.dev/docs/naming'
  );
}

// DON'T ❌
throw new Error('Invalid name');
```

---

### Pattern: Dry-Run Support

```typescript
// DO ✅
async function generateComponent(name: string, options: { dryRun?: boolean }) {
  const files = prepareFiles(name);

  if (options.dryRun) {
    logger.info('DRY RUN MODE - No files will be modified');
    logger.info('Would create:');
    files.forEach(f => logger.info(`  CREATE  ${f.path}`));
    return;
  }

  await Promise.all(files.map(f => fs.writeFile(f.path, f.content)));
}

// DON'T ❌
async function generateComponent(name: string) {
  await fs.writeFile(path, content); // Always writes
}
```

---

### Pattern: Timing Information

```typescript
// DO ✅
logger.time('component-generation');
await generateComponent(name);
const duration = logger.timeEnd('component-generation');
logger.success(`Component created (${duration}ms)`);

// DON'T ❌
await generateComponent(name);
logger.success('Done');
```

---

## Testing Checklist

### Manual Testing

- [ ] Test all commands with `--help`
- [ ] Test common typos (e.g., `generaet`, `isntall`)
- [ ] Test with `--dry-run` flag
- [ ] Test with `--verbose` flag
- [ ] Test error scenarios
- [ ] Test prompts with fuzzy search
- [ ] Test on slow network (long operations)
- [ ] Test with `NO_COLOR` env var

### Automated Testing

```typescript
// Example test for error messages
describe('EnzymeError', () => {
  it('formats error with suggestions', () => {
    const error = new EnzymeError(
      'Component exists',
      'COMPONENT_EXISTS',
      ['Found at: src/components/Button.tsx'],
      ['Use different name', 'Use --force'],
      'https://enzyme.dev/docs/errors'
    );

    const formatted = error.format();

    expect(formatted).toContain('Component exists');
    expect(formatted).toContain('Possible solutions:');
    expect(formatted).toContain('Use different name');
    expect(formatted).toContain('https://enzyme.dev/docs/errors');
  });
});
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "fastest-levenshtein": "^1.0.16",
    "inquirer-autocomplete-prompt": "^3.0.1",
    "cli-progress": "^3.12.0"
  }
}
```

---

## Before Submitting PR

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Examples work
- [ ] No TypeScript errors
- [ ] Linting passes
- [ ] Manual testing complete
- [ ] Screenshots for visual changes
- [ ] Performance tested (no regressions)

---

## Common Pitfalls

### ❌ Don't: Silent failures
```typescript
try {
  await operation();
} catch (error) {
  // Silent failure
}
```

### ✅ Do: Show errors with guidance
```typescript
try {
  await operation();
} catch (error) {
  throw new EnzymeError(
    'Operation failed',
    'OPERATION_FAILED',
    [error.message],
    ['Try running with --verbose', 'Check your configuration'],
    'https://enzyme.dev/docs/errors/operation-failed'
  );
}
```

---

### ❌ Don't: Generic messages
```typescript
console.log('Done');
```

### ✅ Do: Specific, actionable messages
```typescript
logger.success('Component Button created at src/components/Button.tsx');
logger.info('Next: Import with: import { Button } from "@/components"');
```

---

### ❌ Don't: No feedback during long operations
```typescript
await longOperation(); // User sees nothing
```

### ✅ Do: Show progress
```typescript
logger.startSpinner('Processing...');
await longOperation();
logger.succeedSpinner('Completed in 12.3s');
```

---

## Resources

- **Full Guide**: `/home/user/enzyme/DX_IMPROVEMENT_PLAN.md`
- **Executive Summary**: `/home/user/enzyme/DX_EXECUTIVE_SUMMARY.md`
- **Enzyme CLI Source**: `/home/user/enzyme/cli/src/`
- **Current Logger**: `/home/user/enzyme/cli/src/utils/logger.ts`
- **Current Prompts**: `/home/user/enzyme/cli/src/utils/prompts.ts`

---

## Questions?

1. Check the full guide first
2. Look at examples in the guide
3. Review similar libraries (Vite, Prisma, Next.js)
4. Ask in team chat

---

**Last Updated**: 2024-01-15
**Version**: 1.0
