/**
 * Interactive Documentation Features
 * Provides search, navigation, and interactive elements for documentation
 */

import * as path from 'path';
import {
  heading,
  paragraph,
  codeBlock,
  writeDocFile,
  findFiles,
  logger,
  readFile,
} from './utils';

export interface SearchIndex {
  documents: SearchDocument[];
  index: Map<string, Set<number>>;
}

export interface SearchDocument {
  id: number;
  title: string;
  path: string;
  content: string;
  category: string;
  type: 'api' | 'component' | 'hook' | 'route' | 'guide';
  tags: string[];
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  matches: string[];
}

/**
 * Build search index from documentation files
 */
export async function buildSearchIndex(docsDir: string): Promise<SearchIndex> {
  logger.info('Building search index...');

  const documents: SearchDocument[] = [];
  const index = new Map<string, Set<number>>();

  // Find all markdown files
  const mdFiles = await findFiles(docsDir, /\.md$/);

  for (let i = 0; i < mdFiles.length; i++) {
    const filePath = mdFiles[i];
    const content = await readFile(filePath);

    const document = parseDocument(filePath, content, i, docsDir);
    documents.push(document);

    // Index document
    indexDocument(document, index);
  }

  logger.success(`Search index built with ${documents.length} documents`);

  return { documents, index };
}

/**
 * Parse a markdown document
 */
function parseDocument(
  filePath: string,
  content: string,
  id: number,
  docsDir: string
): SearchDocument {
  const relativePath = path.relative(docsDir, filePath);

  // Extract title (first h1)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

  // Extract category from path
  const pathParts = relativePath.split(path.sep);
  const category = pathParts.length > 1 ? pathParts[0] : 'general';

  // Determine type
  const type = determineDocType(category, relativePath);

  // Extract tags
  const tags = extractTags(content);

  return {
    id,
    title,
    path: relativePath,
    content: stripMarkdown(content),
    category,
    type,
    tags,
  };
}

/**
 * Determine document type from path
 */
function determineDocType(
  category: string,
  _path: string
): 'api' | 'component' | 'hook' | 'route' | 'guide' {
  if (category.includes('api')) return 'api';
  if (category.includes('component')) return 'component';
  if (category.includes('hook')) return 'hook';
  if (category.includes('route')) return 'route';
  return 'guide';
}

/**
 * Extract tags from frontmatter or content
 */
function extractTags(content: string): string[] {
  const tags: string[] = [];

  // Extract from frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const tagsMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/);
    if (tagsMatch) {
      tags.push(
        ...tagsMatch[1]
          .split(',')
          .map((t) => t.trim().replace(/['"]/g, ''))
      );
    }
  }

  return tags;
}

/**
 * Strip markdown formatting for search
 */
function stripMarkdown(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/m, '') // Remove frontmatter
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/[*_#]/g, '') // Remove formatting
    .replace(/\n+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Index a document for searching
 */
function indexDocument(document: SearchDocument, index: Map<string, Set<number>>): void {
  const words = tokenize(document.title + ' ' + document.content);

  for (const word of words) {
    const docSet = index.get(word) || new Set<number>();
    docSet.add(document.id);
    index.set(word, docSet);
  }
}

/**
 * Tokenize text for indexing
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

/**
 * Search documentation
 */
export function search(query: string, searchIndex: SearchIndex): SearchResult[] {
  const queryWords = tokenize(query);
  const results = new Map<number, SearchResult>();

  for (const word of queryWords) {
    // Find documents containing this word
    const docIds = searchIndex.index.get(word) || new Set<number>();

    for (const docId of docIds) {
      const document = searchIndex.documents[docId];
      const existing = results.get(docId);

      if (existing) {
        existing.score += 1;
        existing.matches.push(word);
      } else {
        results.set(docId, {
          document,
          score: 1,
          matches: [word],
        });
      }
    }
  }

  // Sort by score
  return Array.from(results.values()).sort((a, b) => b.score - a.score);
}

/**
 * Generate search page
 */
export async function generateSearchPage(docsDir: string): Promise<void> {
  let content = '';

  content += heading(1, 'Search Documentation');
  content += paragraph('Search through all documentation pages.');

  // Search form (for static sites, this would be client-side JS)
  content += codeBlock(
    `<div id="search-container">
  <input
    type="text"
    id="search-input"
    placeholder="Search documentation..."
    aria-label="Search"
  />
  <div id="search-results"></div>
</div>

<script>
  // Client-side search implementation
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 3) {
      searchResults.innerHTML = '';
      return;
    }

    // Fetch search index
    const response = await fetch('/search-index.json');
    const index = await response.json();

    // Perform search
    const results = performSearch(query, index);

    // Display results
    displayResults(results);
  });

  function performSearch(query, index) {
    // Simple client-side search implementation
    const words = query.toLowerCase().split(/\\s+/);
    const results = [];

    for (const doc of index.documents) {
      const docText = (doc.title + ' ' + doc.content).toLowerCase();
      let score = 0;

      for (const word of words) {
        if (docText.includes(word)) {
          score++;
        }
      }

      if (score > 0) {
        results.push({ doc, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  function displayResults(results) {
    if (results.length === 0) {
      searchResults.innerHTML = '<p>No results found.</p>';
      return;
    }

    const html = results
      .slice(0, 10)
      .map((result) => \`
        <div class="search-result">
          <h3>
            <a href="\${result.doc.path}">
              \${result.doc.title}
            </a>
          </h3>
          <p class="search-result-path">\${result.doc.category} / \${result.doc.type}</p>
        </div>
      \`)
      .join('');

    searchResults.innerHTML = html;
  }
</script>

<style>
  #search-container {
    max-width: 600px;
    margin: 2rem auto;
  }

  #search-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border: 2px solid #ddd;
    border-radius: 4px;
  }

  #search-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  #search-results {
    margin-top: 1rem;
  }

  .search-result {
    padding: 1rem;
    border-bottom: 1px solid #eee;
  }

  .search-result h3 {
    margin: 0 0 0.5rem 0;
  }

  .search-result h3 a {
    color: #0066cc;
    text-decoration: none;
  }

  .search-result h3 a:hover {
    text-decoration: underline;
  }

  .search-result-path {
    margin: 0;
    font-size: 0.875rem;
    color: #666;
  }
</style>`,
    'html'
  );

  await writeDocFile(path.join(docsDir, 'search.md'), content);
}

/**
 * Generate search index JSON file
 */
export async function generateSearchIndexFile(
  searchIndex: SearchIndex,
  docsDir: string
): Promise<void> {
  const indexData = {
    documents: searchIndex.documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      path: doc.path,
      content: doc.content.substring(0, 500), // Limit content size
      category: doc.category,
      type: doc.type,
      tags: doc.tags,
    })),
  };

  await writeDocFile(
    path.join(docsDir, 'search-index.json'),
    JSON.stringify(indexData, null, 2)
  );

  logger.success('Search index file generated');
}

/**
 * Generate navigation sidebar
 */
export async function generateNavigationSidebar(docsDir: string): Promise<string> {
  const files = await findFiles(docsDir, /\.md$/);

  // Organize files by category
  const categories = new Map<string, string[]>();

  for (const file of files) {
    const relativePath = path.relative(docsDir, file);
    const parts = relativePath.split(path.sep);
    const category = parts.length > 1 ? parts[0] : 'general';

    const categoryFiles = categories.get(category) || [];
    categoryFiles.push(relativePath);
    categories.set(category, categoryFiles);
  }

  // Generate sidebar HTML
  let sidebar = '<nav class="sidebar">\n';

  for (const [category, files] of categories) {
    sidebar += `  <div class="sidebar-category">\n`;
    sidebar += `    <h3>${capitalize(category)}</h3>\n`;
    sidebar += `    <ul>\n`;

    for (const file of files.sort()) {
      const name = path.basename(file, '.md');
      sidebar += `      <li><a href="/${file}">${name}</a></li>\n`;
    }

    sidebar += `    </ul>\n`;
    sidebar += `  </div>\n`;
  }

  sidebar += '</nav>\n';

  return sidebar;
}

/**
 * Generate breadcrumb navigation
 */
export function generateBreadcrumbs(filePath: string, docsDir: string): string {
  const relativePath = path.relative(docsDir, filePath);
  const parts = relativePath.split(path.sep);

  let breadcrumbs = '<nav class="breadcrumbs">\n';
  breadcrumbs += '  <a href="/">Home</a>\n';

  let currentPath = '';
  for (let i = 0; i < parts.length - 1; i++) {
    currentPath += parts[i] + '/';
    breadcrumbs += `  <span class="separator">/</span>\n`;
    breadcrumbs += `  <a href="/${currentPath}">${capitalize(parts[i])}</a>\n`;
  }

  breadcrumbs += `  <span class="separator">/</span>\n`;
  breadcrumbs += `  <span class="current">${path.basename(filePath, '.md')}</span>\n`;
  breadcrumbs += '</nav>\n';

  return breadcrumbs;
}

/**
 * Generate copy button for code blocks
 */
export function generateCopyButton(): string {
  return `<button class="copy-button" onclick="copyCode(this)" aria-label="Copy code">
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
  </svg>
</button>

<script>
function copyCode(button) {
  const codeBlock = button.parentElement.querySelector('code');
  const text = codeBlock.textContent;

  navigator.clipboard.writeText(text).then(() => {
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.innerHTML = '<svg>...</svg>';
    }, 2000);
  });
}
</script>`;
}

/**
 * Helper function to capitalize text
 */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
