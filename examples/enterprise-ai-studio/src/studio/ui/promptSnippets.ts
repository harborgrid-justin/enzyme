/**
 * Feature #62: saved prompt snippets.
 *
 * A localStorage-backed library of reusable prompt fragments the user can
 * insert into the composer. Persistence goes through enzyme's `shared` storage
 * layer so the Composer doesn't hand-roll `localStorage` access.
 */
import { shared } from '@missionfabric-js/enzyme';

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
  const stored = shared.getLocal<PromptSnippet[]>(KEY);
  return Array.isArray(stored) ? stored : DEFAULT_SNIPPETS;
}

export function saveSnippets(snippets: PromptSnippet[]): void {
  shared.setLocal(KEY, snippets);
}
