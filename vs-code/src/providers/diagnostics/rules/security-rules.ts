import * as vscode from 'vscode';
import { createDiagnostic } from '../enzyme-diagnostics';

export class SecurityRules {
  public async analyze(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    // Check for XSS vulnerabilities
    diagnostics.push(...this.checkXSSVulnerabilities(document, text));

    // Check for exposed secrets
    diagnostics.push(...this.checkExposedSecrets(document, text));

    // Check for insecure API calls
    diagnostics.push(...this.checkInsecureAPICalls(document, text));

    // Check for missing CSP headers
    diagnostics.push(...this.checkMissingCSP(document, text));

    return diagnostics;
  }

  private checkXSSVulnerabilities(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Check for dangerouslySetInnerHTML
    const dangerousPattern = /dangerouslySetInnerHTML\s*=\s*\{\s*{/g;
    let match;

    while ((match = dangerousPattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position.translate(0, match[0].length));

      diagnostics.push(
        createDiagnostic(
          range,
          'Using dangerouslySetInnerHTML can expose your application to XSS attacks. Ensure the content is properly sanitized.',
          vscode.DiagnosticSeverity.Error,
          'xss-vulnerability'
        )
      );
    }

    // Check for innerHTML usage
    const innerHTMLPattern = /\.innerHTML\s*=/g;
    while ((match = innerHTMLPattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position.translate(0, match[0].length));

      diagnostics.push(
        createDiagnostic(
          range,
          'Direct innerHTML assignment can cause XSS vulnerabilities. Use textContent or sanitize the input.',
          vscode.DiagnosticSeverity.Error,
          'xss-vulnerability'
        )
      );
    }

    // Check for eval usage
    const evalPattern = /\beval\s*\(/g;
    while ((match = evalPattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position.translate(0, 4));

      diagnostics.push(
        createDiagnostic(
          range,
          'Using eval() is dangerous and can lead to code injection attacks. Avoid using eval().',
          vscode.DiagnosticSeverity.Error,
          'xss-vulnerability'
        )
      );
    }

    return diagnostics;
  }

  private checkExposedSecrets(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Common patterns for API keys, tokens, and passwords
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([^'"]{20,})['"]/gi, name: 'API Key' },
      { pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"]([^'"]{8,})['"]/gi, name: 'Secret/Password' },
      { pattern: /(?:token|auth[_-]?token)\s*[:=]\s*['"]([^'"]{20,})['"]/gi, name: 'Auth Token' },
      { pattern: /(?:private[_-]?key)\s*[:=]\s*['"]([^'"]{20,})['"]/gi, name: 'Private Key' },
      { pattern: /(?:aws[_-]?access[_-]?key[_-]?id)\s*[:=]\s*['"]([^'"]{16,})['"]/gi, name: 'AWS Access Key' },
    ];

    for (const { pattern, name } of secretPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const secretValue = match[1];

        // Skip common placeholders
        if (this.isPlaceholder(secretValue)) {
          continue;
        }

        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position.translate(0, match[0].length));

        diagnostics.push(
          createDiagnostic(
            range,
            `Potential ${name} exposed in code. Use environment variables instead.`,
            vscode.DiagnosticSeverity.Error,
            'exposed-secret'
          )
        );
      }
    }

    // Check for hardcoded URLs with credentials
    const urlWithCredsPattern = /https?:\/\/[^:]+:[^@]+@/g;
    let match;

    while ((match = urlWithCredsPattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position.translate(0, match[0].length));

      diagnostics.push(
        createDiagnostic(
          range,
          'URL contains embedded credentials. Use environment variables or secure credential management.',
          vscode.DiagnosticSeverity.Error,
          'exposed-secret'
        )
      );
    }

    return diagnostics;
  }

  private checkInsecureAPICalls(
    document: vscode.TextDocument,
    text: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Check for HTTP (non-HTTPS) API calls
    const httpPattern = /(?:fetch|axios|request)\s*\(\s*['"]http:\/\/(?!localhost|127\.0\.0\.1)/g;
    let match;

    while ((match = httpPattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position.translate(0, match[0].length));

      diagnostics.push(
        createDiagnostic(
          range,
          'Using insecure HTTP protocol for API calls. Use HTTPS instead.',
          vscode.DiagnosticSeverity.Warning,
          'insecure-api-call'
        )
      );
    }

    // Check for missing CORS configuration
    const fetchPattern = /fetch\s*\(\s*['"][^'"]+['"]\s*,\s*{/g;
    while ((match = fetchPattern.exec(text)) !== null) {
      const contextStart = match.index;
      const contextEnd = Math.min(text.length, contextStart + 200);
      const context = text.substring(contextStart, contextEnd);

      // Check if credentials are included
      if (!context.includes('credentials')) {
        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position.translate(0, match[0].length));

        diagnostics.push(
          createDiagnostic(
            range,
            'API call may be missing credentials configuration. Consider adding credentials: "include" or "same-origin".',
            vscode.DiagnosticSeverity.Information,
            'missing-credentials'
          )
        );
      }
    }

    return diagnostics;
  }

  private checkMissingCSP(document: vscode.TextDocument, text: string): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    // Check HTML files for missing CSP meta tags
    if (document.fileName.endsWith('.html')) {
      const hasCSP =
        text.includes('Content-Security-Policy') ||
        text.includes('http-equiv="Content-Security-Policy"');

      if (!hasCSP) {
        const position = new vscode.Position(0, 0);
        const range = new vscode.Range(position, position);

        diagnostics.push(
          createDiagnostic(
            range,
            'HTML file is missing Content-Security-Policy meta tag. This helps prevent XSS attacks.',
            vscode.DiagnosticSeverity.Warning,
            'missing-csp'
          )
        );
      }
    }

    // Check for inline scripts in HTML (CSP violation)
    if (document.fileName.endsWith('.html')) {
      const inlineScriptPattern = /<script(?![^>]*src=)[^>]*>/g;
      let match;

      while ((match = inlineScriptPattern.exec(text)) !== null) {
        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position.translate(0, match[0].length));

        diagnostics.push(
          createDiagnostic(
            range,
            'Inline scripts violate Content-Security-Policy. Use external script files with nonces or hashes.',
            vscode.DiagnosticSeverity.Warning,
            'inline-script-csp'
          )
        );
      }
    }

    return diagnostics;
  }

  private isPlaceholder(value: string): boolean {
    const placeholderPatterns = [
      /^xxx+$/i,
      /^placeholder$/i,
      /^test$/i,
      /^sample$/i,
      /^example$/i,
      /^dummy$/i,
      /^your[_-]?.*?[_-]?here$/i,
      /^\*+$/,
      /^\.\.\.$/,
    ];

    return placeholderPatterns.some((pattern) => pattern.test(value));
  }
}
