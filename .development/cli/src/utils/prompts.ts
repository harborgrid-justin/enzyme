/**
 * Prompt Utilities
 *
 * Interactive prompts for CLI commands.
 * In production, this would use inquirer or prompts library.
 */

import * as readline from 'readline';

/**
 * Ask a text question
 */
export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const displayQuestion = defaultValue
      ? `${question} (${defaultValue}): `
      : `${question}: `;

    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Ask a yes/no question
 */
export async function confirm(question: string, defaultValue = true): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const defaultText = defaultValue ? 'Y/n' : 'y/N';
    const displayQuestion = `${question} (${defaultText}): `;

    rl.question(displayQuestion, (answer) => {
      rl.close();

      if (!answer.trim()) {
        resolve(defaultValue);
        return;
      }

      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Select from a list
 */
export async function select(
  question: string,
  choices: string[],
  defaultValue?: string
): Promise<string> {
  console.log(question);
  choices.forEach((choice, index) => {
    const marker = choice === defaultValue ? '>' : ' ';
    console.log(`${marker} ${index + 1}. ${choice}`);
  });

  const answer = await prompt('Enter number', defaultValue ? '1' : undefined);
  const index = parseInt(answer, 10) - 1;

  if (index >= 0 && index < choices.length) {
    return choices[index];
  }

  return defaultValue || choices[0];
}

/**
 * Multi-select from a list
 */
export async function multiSelect(
  question: string,
  choices: string[],
  defaultValues: string[] = []
): Promise<string[]> {
  console.log(question);
  console.log('(Enter numbers separated by commas)');

  choices.forEach((choice, index) => {
    const marker = defaultValues.includes(choice) ? '[x]' : '[ ]';
    console.log(`${marker} ${index + 1}. ${choice}`);
  });

  const answer = await prompt('Enter numbers (e.g., 1,3,4)', '');

  if (!answer) {
    return defaultValues;
  }

  const indices = answer
    .split(',')
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < choices.length);

  return indices.map((i) => choices[i]);
}

/**
 * Input with validation
 */
export async function input(
  question: string,
  options: {
    default?: string;
    validate?: (value: string) => boolean | string;
  } = {}
): Promise<string> {
  while (true) {
    const answer = await prompt(question, options.default);

    if (options.validate) {
      const validation = options.validate(answer);

      if (validation === true) {
        return answer;
      }

      if (typeof validation === 'string') {
        console.error(`❌ ${validation}`);
        continue;
      }

      console.error('❌ Invalid input');
      continue;
    }

    return answer;
  }
}
