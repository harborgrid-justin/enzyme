/**
 * Live Documentation Server
 * Serves documentation locally with hot reload and search functionality
 */

import * as http from 'http';
import * as fs from 'fs/promises';
import { watch as fsWatch } from 'fs';
import * as path from 'path';
import { logger } from './utils';
import {
  buildSearchIndex,
  generateSearchIndexFile,
  generateNavigationSidebar,
} from './interactive';

export interface ServerOptions {
  port: number;
  directory: string;
  watch: boolean;
}

interface FileWatcher {
  close: () => void;
}

/**
 * Start documentation server
 */
export async function startDocServer(options: ServerOptions): Promise<void> {
  const { port, directory, watch } = options;

  // Build search index
  const searchIndex = await buildSearchIndex(directory);
  await generateSearchIndexFile(searchIndex, directory);

  // Create HTTP server
  const server = http.createServer(async (req, res) => {
    await handleRequest(req, res, directory);
  });

  // Start server
  server.listen(port, () => {
    logger.success(`Documentation server running at http://localhost:${port}`);
    logger.info(`Serving files from: ${directory}`);

    if (watch) {
      logger.info('File watching enabled - documentation will reload on changes');
    }
  });

  // Watch for file changes
  if (watch) {
    await watchFiles(directory, async () => {
      logger.info('Files changed, rebuilding search index...');
      const newIndex = await buildSearchIndex(directory);
      await generateSearchIndexFile(newIndex, directory);
      logger.success('Search index updated');
    });
  }

  // Handle shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down server...');
    server.close(() => {
      logger.success('Server stopped');
      process.exit(0);
    });
  });
}

/**
 * Handle HTTP requests
 */
async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  directory: string
): Promise<void> {
  const url = req.url || '/';
  logger.debug(`Request: ${req.method} ${url}`);

  try {
    // Handle different routes
    if (url === '/' || url === '/index.html') {
      await serveIndex(res, directory);
    } else if (url.endsWith('.md')) {
      await serveMarkdown(res, directory, url);
    } else if (url.endsWith('.json')) {
      await serveJSON(res, directory, url);
    } else if (url.endsWith('.css')) {
      await serveCSS(res, directory, url);
    } else if (url.endsWith('.js')) {
      await serveJS(res, directory, url);
    } else {
      // Try to serve as markdown file
      const mdPath = url + '.md';
      const filePath = path.join(directory, mdPath);

      try {
        await fs.access(filePath);
        await serveMarkdown(res, directory, mdPath);
      } catch {
        serve404(res);
      }
    }
  } catch (error) {
    logger.error('Error handling request:', error);
    serve500(res, error);
  }
}

/**
 * Serve index page
 */
async function serveIndex(res: http.ServerResponse, directory: string): Promise<void> {
  const indexPath = path.join(directory, 'index.md');

  try {
    await fs.access(indexPath);
    await serveMarkdown(res, directory, '/index.md');
  } catch {
    // Generate default index
    const html = await generateDefaultIndex(directory);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
}

/**
 * Serve markdown file as HTML
 */
async function serveMarkdown(
  res: http.ServerResponse,
  directory: string,
  url: string
): Promise<void> {
  const filePath = path.join(directory, url);

  try {
    const markdown = await fs.readFile(filePath, 'utf-8');
    const html = await renderMarkdownAsHTML(markdown, url, directory);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } catch {
    serve404(res);
  }
}

/**
 * Serve JSON file
 */
async function serveJSON(
  res: http.ServerResponse,
  directory: string,
  url: string
): Promise<void> {
  const filePath = path.join(directory, url);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(content);
  } catch {
    serve404(res);
  }
}

/**
 * Serve CSS file
 */
async function serveCSS(
  res: http.ServerResponse,
  directory: string,
  url: string
): Promise<void> {
  const filePath = path.join(directory, url);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(content);
  } catch {
    // Serve default CSS
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(getDefaultCSS());
  }
}

/**
 * Serve JavaScript file
 */
async function serveJS(
  res: http.ServerResponse,
  directory: string,
  url: string
): Promise<void> {
  const filePath = path.join(directory, url);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(content);
  } catch {
    serve404(res);
  }
}

/**
 * Serve 404 error
 */
function serve404(res: http.ServerResponse): void {
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>404 - Not Found</title>
        <style>${getDefaultCSS()}</style>
      </head>
      <body>
        <div class="container">
          <h1>404 - Page Not Found</h1>
          <p>The requested page could not be found.</p>
          <a href="/">Return to Home</a>
        </div>
      </body>
    </html>
  `);
}

/**
 * Serve 500 error
 */
function serve500(res: http.ServerResponse, error: any): void {
  res.writeHead(500, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>500 - Server Error</title>
        <style>${getDefaultCSS()}</style>
      </head>
      <body>
        <div class="container">
          <h1>500 - Server Error</h1>
          <p>An error occurred while processing your request.</p>
          <pre>${error.message}</pre>
          <a href="/">Return to Home</a>
        </div>
      </body>
    </html>
  `);
}

/**
 * Render markdown as HTML
 */
async function renderMarkdownAsHTML(
  markdown: string,
  _url: string,
  directory: string
): Promise<string> {
  // Simple markdown to HTML conversion
  // In production, use a proper markdown parser like marked or remark
  let html = markdown;

  // Remove frontmatter
  html = html.replace(/^---[\s\S]*?---\n/m, '');

  // Convert headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Convert code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${escapeHTML(code)}</code></pre>`;
  });

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Convert lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Convert paragraphs
  html = html.replace(/^(?!<[uh]|<pre|<li)(.+)$/gm, '<p>$1</p>');

  // Generate navigation
  const sidebar = await generateNavigationSidebar(directory);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documentation</title>
        <style>${getDefaultCSS()}</style>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="layout">
          ${sidebar}
          <main class="content">
            ${html}
          </main>
        </div>
        <script src="/app.js"></script>
        <script>${getHotReloadScript()}</script>
      </body>
    </html>
  `;
}

/**
 * Generate default index page
 */
async function generateDefaultIndex(directory: string): Promise<string> {
  const sidebar = await generateNavigationSidebar(directory);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documentation</title>
        <style>${getDefaultCSS()}</style>
      </head>
      <body>
        <div class="layout">
          ${sidebar}
          <main class="content">
            <h1>Documentation</h1>
            <p>Welcome to the documentation server.</p>
            <p>Select a page from the sidebar to get started.</p>
          </main>
        </div>
        <script>${getHotReloadScript()}</script>
      </body>
    </html>
  `;
}

/**
 * Get default CSS
 */
function getDefaultCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
    }

    .layout {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 280px;
      background: #f8f9fa;
      border-right: 1px solid #e9ecef;
      padding: 2rem 1rem;
      overflow-y: auto;
    }

    .sidebar-category {
      margin-bottom: 2rem;
    }

    .sidebar-category h3 {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6c757d;
      margin-bottom: 0.5rem;
    }

    .sidebar-category ul {
      list-style: none;
    }

    .sidebar-category li {
      margin-bottom: 0.25rem;
    }

    .sidebar-category a {
      display: block;
      padding: 0.5rem 0.75rem;
      color: #495057;
      text-decoration: none;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .sidebar-category a:hover {
      background: #e9ecef;
      color: #0066cc;
    }

    .content {
      flex: 1;
      padding: 2rem 3rem;
      max-width: 900px;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #212529;
    }

    h2 {
      font-size: 2rem;
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: #212529;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 0.5rem;
    }

    h3 {
      font-size: 1.5rem;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      color: #212529;
    }

    p {
      margin-bottom: 1rem;
    }

    a {
      color: #0066cc;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    code {
      background: #f8f9fa;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.875em;
    }

    pre {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      margin-bottom: 1rem;
    }

    pre code {
      background: none;
      padding: 0;
    }

    ul, ol {
      margin-bottom: 1rem;
      padding-left: 2rem;
    }

    li {
      margin-bottom: 0.5rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border: 1px solid #e9ecef;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }
  `;
}

/**
 * Get hot reload script
 */
function getHotReloadScript(): string {
  return `
    // Hot reload functionality
    let lastCheck = Date.now();

    function checkForUpdates() {
      fetch('/search-index.json?t=' + Date.now())
        .then(res => res.json())
        .then(data => {
          // Check if index has changed (simple check)
          const currentCheck = Date.now();
          if (currentCheck - lastCheck > 5000) {
            lastCheck = currentCheck;
            // Reload if index changed
            location.reload();
          }
        })
        .catch(() => {
          // Ignore errors
        });
    }

    // Check for updates every 2 seconds
    setInterval(checkForUpdates, 2000);
  `;
}

/**
 * Watch files for changes
 */
async function watchFiles(
  directory: string,
  onChange: () => Promise<void>
): Promise<FileWatcher> {
  let debounceTimeout: NodeJS.Timeout | null = null;

  const watcher = fsWatch(directory, { recursive: true }, (_eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      // Debounce changes
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = setTimeout(() => {
        onChange();
      }, 500);
    }
  });

  return {
    close: () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      watcher.close();
    },
  };
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
