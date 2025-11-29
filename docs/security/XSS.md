# XSS Prevention

Comprehensive Cross-Site Scripting (XSS) prevention with context-aware sanitization, content validation, and safe HTML handling for @missionfabric-js/enzyme.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [HTML Sanitization](#html-sanitization)
- [Context-Aware Encoding](#context-aware-encoding)
- [Content Validation](#content-validation)
- [Safe HTML Rendering](#safe-html-rendering)
- [Input Validation](#input-validation)
- [React Integration](#react-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

XSS prevention protects your application from malicious script injection by sanitizing user input, encoding output, and validating content before rendering.

### Key Features

- **HTML Sanitization**: Remove dangerous HTML tags and attributes
- **Context-Aware Encoding**: Encode content based on rendering context
- **Content Validation**: Detect and report XSS attempts
- **Safe innerHTML**: React-friendly safe HTML rendering
- **URL Validation**: Prevent javascript: and data: URL attacks
- **Email Validation**: Secure email address validation
- **Tag Stripping**: Remove all HTML tags for plain text
- **React Hooks**: Easy integration with React components

## Quick Start

### Enable XSS Protection

```tsx
import { SecurityProvider } from '@missionfabric-js/enzyme/security';

function App() {
  return (
    <SecurityProvider
      config={{
        xss: {
          enabled: true,
          sanitizeByDefault: true,
          reportAttempts: true,
        },
      }}
    >
      <YourApp />
    </SecurityProvider>
  );
}
```

### Sanitize User Content

```tsx
import { useSanitizedContent } from '@/lib/security';

function UserPost({ post }) {
  const safeContent = useSanitizedContent(post.content);

  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: safeContent }} />
    </article>
  );
}
```

### Validate Input

```tsx
import { useValidatedInput } from '@/lib/security';

function CommentInput() {
  const {
    value,
    setValue,
    isValid,
    error,
  } = useValidatedInput('', {
    validate: (val) => {
      if (/<script|javascript:|onerror=/i.test(val)) {
        return 'Suspicious content detected';
      }
      return null;
    },
    sanitize: (val) => stripTags(val),
  });

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={!isValid ? 'error' : ''}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

## HTML Sanitization

### Basic Sanitization

```typescript
import { sanitizeHTML } from '@/lib/security';

const dirty = '<p>Hello</p><script>alert("XSS")</script>';
const clean = sanitizeHTML(dirty);

console.log(clean); // '<p>Hello</p>'
```

### Sanitization with Options

```typescript
import { sanitizeHTML } from '@/lib/security';

const html = `
  <p>Safe content</p>
  <a href="https://example.com" onclick="alert('XSS')">Link</a>
  <script>alert('XSS')</script>
  <img src="x" onerror="alert('XSS')">
`;

const clean = sanitizeHTML(html, {
  allowedTags: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedClasses: {
    'p': ['text-*', 'bg-*'],
  },
});

// Result:
// <p>Safe content</p>
// <a href="https://example.com">Link</a>
// (scripts and dangerous attributes removed)
```

### Using useSanitizedContent Hook

```tsx
import { useSanitizedContent } from '@/lib/security';

function BlogPost({ content }) {
  const safeContent = useSanitizedContent(content, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'u', 'strike',
      'a', 'img',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'code': ['class'],
    },
  });

  return <div dangerouslySetInnerHTML={{ __html: safeContent }} />;
}
```

### Strip All Tags

```typescript
import { stripTags } from '@/lib/security';

const html = '<p>Hello <strong>World</strong></p>';
const text = stripTags(html);

console.log(text); // 'Hello World'
```

## Context-Aware Encoding

### HTML Context

```typescript
import { encodeHTML } from '@/lib/security';

const userInput = '<script>alert("XSS")</script>';
const encoded = encodeHTML(userInput);

console.log(encoded); // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
```

### HTML Attribute Context

```typescript
import { encodeHTMLAttribute } from '@/lib/security';

const userInput = '" onload="alert(\'XSS\')';
const encoded = encodeHTMLAttribute(userInput);

// Safe to use in attributes
<div title={encoded} />
```

### JavaScript Context

```typescript
import { encodeJavaScript } from '@/lib/security';

const userInput = '\'; alert("XSS"); //';
const encoded = encodeJavaScript(userInput);

// Safe to use in JavaScript strings
const script = `const value = '${encoded}';`;
```

### CSS Context

```typescript
import { encodeCSS } from '@/lib/security';

const userInput = 'red; } body { background: url("javascript:alert(1)") }';
const encoded = encodeCSS(userInput);

// Safe to use in CSS
const style = `color: ${encoded};`;
```

### URL Context

```typescript
import { encodeURL } from '@/lib/security';

const userInput = 'param1=value1&param2=<script>';
const encoded = encodeURL(userInput);

console.log(encoded); // 'param1%3Dvalue1%26param2%3D%3Cscript%3E'
```

### Context-Based Encoding

```typescript
import { encodeForContext } from '@/lib/security';

const userInput = '<script>alert("XSS")</script>';

const htmlEncoded = encodeForContext(userInput, 'html');
const jsEncoded = encodeForContext(userInput, 'javascript');
const cssEncoded = encodeForContext(userInput, 'css');
const urlEncoded = encodeForContext(userInput, 'url');
```

## Content Validation

### Detect Dangerous Content

```typescript
import { detectDangerousContent } from '@/lib/security';

const content = '<img src=x onerror="alert(1)">';
const threats = detectDangerousContent(content);

console.log(threats);
// [
//   { type: 'javascript-event', pattern: 'onerror', location: 10 },
//   { type: 'dangerous-tag', pattern: 'img', location: 1 }
// ]
```

### Quick Danger Check

```typescript
import { isDangerous } from '@/lib/security';

const content1 = '<p>Safe content</p>';
const content2 = '<script>alert(1)</script>';

console.log(isDangerous(content1)); // false
console.log(isDangerous(content2)); // true
```

### URL Validation

```typescript
import { isValidURL } from '@/lib/security';

console.log(isValidURL('https://example.com')); // true
console.log(isValidURL('javascript:alert(1)')); // false
console.log(isValidURL('data:text/html,<script>alert(1)</script>')); // false
console.log(isValidURL('//evil.com')); // false
```

### Email Validation

```typescript
import { isValidEmail } from '@/lib/security';

console.log(isValidEmail('user@example.com')); // true
console.log(isValidEmail('invalid@')); // false
console.log(isValidEmail('<script>@example.com')); // false
```

### Creating Safe HTML Props

```typescript
import { createSafeHTMLProps } from '@/lib/security';

const userContent = '<p>User content with <script>alert(1)</script></p>';
const safeProps = createSafeHTMLProps(userContent, {
  allowedTags: ['p', 'br', 'strong', 'em'],
});

// Use in React
<div {...safeProps} />
```

## Safe HTML Rendering

### useSafeInnerHTML Hook

```tsx
import { useSafeInnerHTML } from '@/lib/security';

function UserContent({ html }) {
  const safeProps = useSafeInnerHTML(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'a'],
    allowedAttributes: {
      'a': ['href'],
    },
  });

  return <div {...safeProps} />;
}
```

### useSafeText Hook

```tsx
import { useSafeText } from '@/lib/security';

function UserText({ content }) {
  const safeText = useSafeText(content);

  // Automatically strips all HTML tags
  return <p>{safeText}</p>;
}
```

### Manual Safe Rendering

```tsx
import { sanitizeHTML } from '@/lib/security';

function SafeContent({ html }) {
  const safe = useMemo(() => sanitizeHTML(html), [html]);

  return <div dangerouslySetInnerHTML={{ __html: safe }} />;
}
```

## Input Validation

### useValidatedInput Hook

```tsx
import { useValidatedInput } from '@/lib/security';

function EmailInput() {
  const {
    value,
    setValue,
    isValid,
    error,
  } = useValidatedInput('', {
    validate: (val) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        return 'Invalid email address';
      }
      if (/<|>|script/i.test(val)) {
        return 'Suspicious content detected';
      }
      return null;
    },
    sanitize: (val) => val.trim().toLowerCase(),
  });

  return (
    <div>
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={!isValid && value ? 'error' : ''}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

### Real-Time Validation

```tsx
import { useValidatedInput } from '@/lib/security';

function UsernameInput() {
  const { value, setValue, isValid, error } = useValidatedInput('', {
    validate: (val) => {
      if (val.length < 3) {
        return 'Username must be at least 3 characters';
      }
      if (!/^[a-zA-Z0-9_]+$/.test(val)) {
        return 'Username can only contain letters, numbers, and underscores';
      }
      if (/<|>|script|alert/i.test(val)) {
        return 'Invalid characters detected';
      }
      return null;
    },
    debounce: 300, // Validate after 300ms of inactivity
  });

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={!isValid && value ? 'error' : ''}
      />
      {error && <span className="error">{error}</span>}
      {isValid && value && <span className="success">✓</span>}
    </div>
  );
}
```

### Reporting XSS Attempts

```tsx
import { useSecurityContext } from '@/lib/security';

function SecureInput() {
  const { reportViolation, sanitize } = useSecurityContext();

  const handleChange = (e) => {
    const value = e.target.value;

    // Check for suspicious patterns
    if (/<script|javascript:|onerror=|onclick=/i.test(value)) {
      reportViolation({
        type: 'xss-attempt',
        severity: 'high',
        details: {
          input: value,
          pattern: 'Suspicious XSS pattern detected',
          location: 'user-input',
        },
        blocked: true,
      });

      // Sanitize the input
      e.target.value = sanitize(value);
    }
  };

  return <input onChange={handleChange} />;
}
```

## React Integration

### Sanitized Component

```tsx
import { useSanitizedContent } from '@/lib/security';

function SanitizedHTML({ html, allowedTags, allowedAttributes }) {
  const safe = useSanitizedContent(html, {
    allowedTags,
    allowedAttributes,
  });

  return <div dangerouslySetInnerHTML={{ __html: safe }} />;
}

// Usage
<SanitizedHTML
  html={userContent}
  allowedTags={['p', 'br', 'a', 'strong', 'em']}
  allowedAttributes={{ 'a': ['href'] }}
/>
```

### Safe Link Component

```tsx
import { isValidURL } from '@/lib/security';

function SafeLink({ href, children, ...props }) {
  if (!isValidURL(href)) {
    console.warn('Invalid URL:', href);
    return <span>{children}</span>;
  }

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
```

### Safe Image Component

```tsx
import { isValidURL } from '@/lib/security';

function SafeImage({ src, alt, ...props }) {
  if (!isValidURL(src) || /^(javascript|data):/i.test(src)) {
    return <div className="broken-image">{alt || 'Invalid image'}</div>;
  }

  return <img src={src} alt={alt} {...props} />;
}
```

## Best Practices

### 1. Sanitize All User Content

```tsx
// Good: Sanitize before rendering
import { useSanitizedContent } from '@/lib/security';

function UserPost({ content }) {
  const safe = useSanitizedContent(content);
  return <div dangerouslySetInnerHTML={{ __html: safe }} />;
}

// Bad: Render raw user content
function UserPost({ content }) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
```

### 2. Prefer React's Auto-Escaping

```tsx
// Good: React automatically escapes
function Comment({ text }) {
  return <p>{text}</p>;
}

// Bad: Unnecessarily using dangerouslySetInnerHTML
function Comment({ text }) {
  return <p dangerouslySetInnerHTML={{ __html: text }} />;
}
```

### 3. Validate URLs Before Use

```tsx
// Good: Validate URL
import { isValidURL } from '@/lib/security';

function Link({ href, children }) {
  if (!isValidURL(href)) {
    return <span>{children}</span>;
  }
  return <a href={href}>{children}</a>;
}

// Bad: Use URL without validation
function Link({ href, children }) {
  return <a href={href}>{children}</a>;
}
```

### 4. Use Allowlists, Not Blocklists

```typescript
// Good: Allowlist of safe tags
const options = {
  allowedTags: ['p', 'br', 'strong', 'em', 'a'],
  allowedAttributes: {
    'a': ['href'],
  },
};

// Bad: Trying to block dangerous tags
const options = {
  disallowedTags: ['script', 'iframe', 'object'], // Incomplete!
};
```

### 5. Sanitize on Output, Not Input

```tsx
// Good: Sanitize when rendering
function Display({ userContent }) {
  const safe = useSanitizedContent(userContent);
  return <div dangerouslySetInnerHTML={{ __html: safe }} />;
}

// Acceptable: Store original, sanitize on output
// This allows you to adjust sanitization rules later
```

### 6. Report Suspicious Activity

```tsx
import { useSecurityContext } from '@/lib/security';

function MonitoredInput() {
  const { reportViolation } = useSecurityContext();

  const handleInput = (e) => {
    const value = e.target.value;

    if (/<script|javascript:|onerror=/i.test(value)) {
      reportViolation({
        type: 'xss-attempt',
        severity: 'high',
        details: { input: value },
      });
    }
  };

  return <input onInput={handleInput} />;
}
```

## Troubleshooting

### Issue: Sanitization Removing Valid HTML

**Solution:** Configure allowed tags and attributes:

```tsx
const safe = useSanitizedContent(html, {
  allowedTags: ['p', 'br', 'strong', 'em', 'a', 'img'],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'width', 'height'],
  },
});
```

### Issue: Links Being Removed

**Solution:** Ensure 'a' tag and href attribute are allowed:

```tsx
const safe = useSanitizedContent(html, {
  allowedTags: ['a'],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
});
```

### Issue: Content Not Displaying

**Solution:** Check if content is being over-sanitized:

```tsx
import { sanitizeHTML } from '@/lib/security';

const original = '<p>Hello World</p>';
const sanitized = sanitizeHTML(original, {
  allowedTags: ['p'],
});

console.log('Original:', original);
console.log('Sanitized:', sanitized);
```

### Issue: False Positive XSS Detection

**Solution:** Adjust validation patterns:

```tsx
const { value, setValue } = useValidatedInput('', {
  validate: (val) => {
    // More specific pattern
    if (/<script[^>]*>|javascript:/i.test(val)) {
      return 'Invalid content';
    }
    return null;
  },
});
```

## XSS Attack Patterns

### Reflected XSS

```tsx
// Vulnerable
function Search() {
  const query = new URLSearchParams(window.location.search).get('q');
  return <div>Results for: {query}</div>; // Safe - React auto-escapes
}

// Attack: https://example.com/search?q=<script>alert(1)</script>
// React's auto-escaping prevents this attack
```

### Stored XSS

```tsx
// Vulnerable
function Comment({ comment }) {
  return <div dangerouslySetInnerHTML={{ __html: comment.text }} />;
}

// Protected
function Comment({ comment }) {
  const safe = useSanitizedContent(comment.text);
  return <div dangerouslySetInnerHTML={{ __html: safe }} />;
}
```

### DOM-Based XSS

```tsx
// Vulnerable
function Display() {
  const hash = window.location.hash.substring(1);
  return <div dangerouslySetInnerHTML={{ __html: hash }} />;
}

// Protected
function Display() {
  const hash = window.location.hash.substring(1);
  const safe = useSanitizedContent(hash);
  return <div dangerouslySetInnerHTML={{ __html: safe }} />;
}
```

## See Also

- [CSRF Protection](./CSRF.md) - Cross-site request forgery protection
- [CSP Management](./CSP.md) - Content Security Policy
- [Secure Storage](./SECURE_STORAGE.md) - Encrypted client-side storage
- [Security Overview](./README.md) - Security module overview
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
