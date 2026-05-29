/**
 * Feature #62: saved prompt snippets.
 *
 * A tiny localStorage-backed library of reusable prompt fragments the user can
 * insert into the composer. Framework-free so the Composer can read/write it
 * directly.
 */
const KEY = 'enzyme-ai-studio-snippets';

export interface PromptSnippet {
  id: string;
  label: string;
  text: string;
}

const DEFAULT_SNIPPETS: PromptSnippet[] = [
  { id: 'tldr', label: 'TL;DR', text: 'Summarize the above in 3 bullet points.' },
  { id: 'eli5', label: 'Explain simply', text: 'Explain this like I am five.' },
  {
    id: 'tests',
    label: 'Add tests',
    text: 'Write thorough unit tests for the code above, covering edge cases.',
  },
];

export function loadSnippets(): PromptSnippet[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return DEFAULT_SNIPPETS;
    const parsed = JSON.parse(raw) as PromptSnippet[];
    return Array.isArray(parsed) ? parsed : DEFAULT_SNIPPETS;
  } catch {
    return DEFAULT_SNIPPETS;
  }
}

export function saveSnippets(snippets: PromptSnippet[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snippets));
  } catch {
    // Best-effort.
  }
}
