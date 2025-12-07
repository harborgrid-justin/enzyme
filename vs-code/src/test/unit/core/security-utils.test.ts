/**
 * @file Security Utils Unit Tests
 * @description Comprehensive unit tests for security utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  escapeJs,
  generateNonce,
  buildCsp,
  sanitizeInput,
  sanitizePath,
  safeJsonStringify,
} from '../../../core/security-utils';

describe('Security Utils', () => {
  describe('escapeHtml', () => {
    it('should escape basic HTML entities', () => {
      const input = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(input);

      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;');
      expect(escapeHtml("It's nice")).toBe('It&#39;s nice');
    });

    it('should escape forward slashes', () => {
      expect(escapeHtml('</script>')).toBe('&lt;&#x2F;script&gt;');
    });

    it('should escape backticks', () => {
      expect(escapeHtml('Use `code`')).toBe('Use &#x60;code&#x60;');
    });

    it('should escape equals signs', () => {
      expect(escapeHtml('a=b')).toBe('a&#x3D;b');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
      expect(escapeHtml(42 as any)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle strings with no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('escapeJs', () => {
    it('should escape backslashes', () => {
      expect(escapeJs('C:\\Users')).toBe('C:\\\\Users');
    });

    it('should escape quotes', () => {
      expect(escapeJs('Say "hello"')).toBe('Say \\"hello\\"');
      expect(escapeJs("It's nice")).toBe("It\\'s nice");
    });

    it('should escape newlines and special whitespace', () => {
      expect(escapeJs('Line 1\nLine 2')).toBe('Line 1\\nLine 2');
      expect(escapeJs('Tab\there')).toBe('Tab\\there');
      expect(escapeJs('Carriage\rreturn')).toBe('Carriage\\rreturn');
    });

    it('should escape angle brackets with unicode', () => {
      expect(escapeJs('<script>')).toBe('\\u003Cscript\\u003E');
    });

    it('should handle non-string input', () => {
      expect(escapeJs(null as any)).toBe('');
      expect(escapeJs(undefined as any)).toBe('');
    });

    it('should prevent script injection', () => {
      const malicious = '</script><script>alert("XSS")</script>';
      const escaped = escapeJs(malicious);

      expect(escaped).not.toContain('</script>');
      expect(escaped).toContain('\\u003C');
      expect(escaped).toContain('\\u003E');
    });
  });

  describe('generateNonce', () => {
    it('should generate a non-empty string', () => {
      const nonce = generateNonce();
      expect(nonce).toBeTruthy();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate base64 encoded strings', () => {
      const nonce = generateNonce();
      // Base64 regex pattern
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate consistent length nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1.length).toBe(nonce2.length);
    });
  });

  describe('buildCsp', () => {
    const webviewCspSource = 'vscode-webview://test';
    const nonce = 'test-nonce-123';

    it('should build basic CSP with required directives', () => {
      const csp = buildCsp(webviewCspSource, nonce);

      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain(`style-src ${webviewCspSource} 'nonce-${nonce}'`);
      expect(csp).toContain(`script-src 'nonce-${nonce}'`);
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'none'");
      expect(csp).toContain("form-action 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should include font-src by default', () => {
      const csp = buildCsp(webviewCspSource, nonce);
      expect(csp).toContain(`font-src ${webviewCspSource}`);
    });

    it('should exclude font-src when disabled', () => {
      const csp = buildCsp(webviewCspSource, nonce, { allowFonts: false });
      expect(csp).not.toContain('font-src');
    });

    it('should include img-src by default', () => {
      const csp = buildCsp(webviewCspSource, nonce);
      expect(csp).toContain(`img-src ${webviewCspSource} https: data:`);
    });

    it('should exclude img-src when disabled', () => {
      const csp = buildCsp(webviewCspSource, nonce, { allowImages: false });
      expect(csp).not.toContain('img-src');
    });

    it('should include custom connect-src targets', () => {
      const csp = buildCsp(webviewCspSource, nonce, {
        allowConnections: ['https://api.example.com', 'wss://socket.example.com'],
      });

      expect(csp).toContain('connect-src');
      expect(csp).toContain('https://api.example.com');
      expect(csp).toContain('wss://socket.example.com');
    });

    it('should default connect-src to webview source only', () => {
      const csp = buildCsp(webviewCspSource, nonce);
      expect(csp).toContain(`connect-src ${webviewCspSource}`);
    });

    it('should not allow unsafe-inline or unsafe-eval', () => {
      const csp = buildCsp(webviewCspSource, nonce);
      expect(csp).not.toContain('unsafe-inline');
      expect(csp).not.toContain('unsafe-eval');
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\t\ntest\n\t')).toBe('test');
    });

    it('should limit length to default 1000 characters', () => {
      const longString = 'a'.repeat(2000);
      const sanitized = sanitizeInput(longString);
      expect(sanitized.length).toBe(1000);
    });

    it('should limit length to custom max length', () => {
      const input = 'a'.repeat(100);
      const sanitized = sanitizeInput(input, 50);
      expect(sanitized.length).toBe(50);
    });

    it('should remove control characters', () => {
      const input = 'hello\x00\x01\x02world';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('helloworld');
      expect(sanitized).not.toContain('\x00');
    });

    it('should preserve normal characters', () => {
      const input = 'Hello World 123!@#';
      expect(sanitizeInput(input)).toBe(input);
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(42 as any)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('sanitizePath', () => {
    it('should allow safe paths', () => {
      expect(sanitizePath('file.txt')).toBe('file.txt');
      expect(sanitizePath('folder/file.txt')).toBe('folder/file.txt');
      expect(sanitizePath('a/b/c/file.txt')).toBe('a/b/c/file.txt');
    });

    it('should reject path traversal with ..', () => {
      expect(sanitizePath('../file.txt')).toBeNull();
      expect(sanitizePath('folder/../file.txt')).toBeNull();
      expect(sanitizePath('../../etc/passwd')).toBeNull();
    });

    it('should reject URL encoded path traversal', () => {
      expect(sanitizePath('%2e%2e/file.txt')).toBeNull();
      expect(sanitizePath('folder/%2e%2e/file.txt')).toBeNull();
    });

    it('should reject double URL encoded traversal', () => {
      expect(sanitizePath('%252e%252e/file.txt')).toBeNull();
    });

    it('should reject mixed encoding traversal', () => {
      expect(sanitizePath('.%2e/file.txt')).toBeNull();
      expect(sanitizePath('%2e./file.txt')).toBeNull();
    });

    it('should remove null bytes', () => {
      const path = sanitizePath('file\x00.txt');
      expect(path).toBe('file.txt');
    });

    it('should normalize path separators', () => {
      const path = sanitizePath('folder\\file.txt');
      expect(path).toBe('folder/file.txt');
    });

    it('should remove leading slashes', () => {
      const path = sanitizePath('/absolute/path.txt');
      expect(path).toBe('absolute/path.txt');
    });

    it('should reject consecutive slashes', () => {
      expect(sanitizePath('folder//file.txt')).toBeNull();
      expect(sanitizePath('a///b/file.txt')).toBeNull();
    });

    it('should reject unsafe characters', () => {
      expect(sanitizePath('file<>.txt')).toBeNull();
      expect(sanitizePath('file|.txt')).toBeNull();
      expect(sanitizePath('file?.txt')).toBeNull();
      expect(sanitizePath('file*.txt')).toBeNull();
    });

    it('should handle non-string input', () => {
      expect(sanitizePath(null as any)).toBeNull();
      expect(sanitizePath(undefined as any)).toBeNull();
    });

    it('should validate against allowed base path', () => {
      const base = '/safe/directory';

      expect(sanitizePath('file.txt', base)).toBe('/safe/directory/file.txt');
      expect(sanitizePath('/safe/directory/file.txt', base)).toBe('/safe/directory/file.txt');
    });

    it('should reject paths outside allowed base', () => {
      const base = '/safe/directory';

      // These should be rejected as they try to escape the base
      expect(sanitizePath('../../../etc/passwd', base)).toBeNull();
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify objects', () => {
      const data = { key: 'value', number: 42 };
      const json = safeJsonStringify(data);

      expect(json).toContain('"key":"value"');
      expect(json).toContain('"number":42');
    });

    it('should escape angle brackets', () => {
      const data = { script: '</script>' };
      const json = safeJsonStringify(data);

      expect(json).not.toContain('</script>');
      expect(json).toContain('\\u003C');
      expect(json).toContain('\\u003E');
    });

    it('should escape ampersands', () => {
      const data = { text: 'Tom & Jerry' };
      const json = safeJsonStringify(data);

      expect(json).toContain('\\u0026');
    });

    it('should escape quotes', () => {
      const data = { quote: "Say 'hello'" };
      const json = safeJsonStringify(data);

      expect(json).toContain('\\u0027');
    });

    it('should prevent script injection', () => {
      const data = { payload: '</script><script>alert("XSS")</script>' };
      const json = safeJsonStringify(data);

      expect(json).not.toContain('</script>');
      expect(json).not.toContain('<script>');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const json = safeJsonStringify(data);

      expect(json).toBe('[1,2,3]');
    });

    it('should handle nested structures', () => {
      const data = {
        nested: {
          array: [1, 2, { deep: '<script>' }],
        },
      };
      const json = safeJsonStringify(data);

      expect(json).not.toContain('<script>');
      expect(json).toContain('\\u003Cscript\\u003E');
    });

    it('should handle null and undefined', () => {
      expect(safeJsonStringify(null)).toBe('null');
      expect(safeJsonStringify(undefined)).toBe('undefined');
    });

    it('should handle primitives', () => {
      expect(safeJsonStringify(42)).toBe('42');
      expect(safeJsonStringify('string')).toBe('"string"');
      expect(safeJsonStringify(true)).toBe('true');
    });
  });
});
