# Enzyme Formatting Extension

Enterprise-grade formatting utilities for the enzyme library with comprehensive i18n support.

## Features

- **String Case Converters** - camelCase, PascalCase, snake_case, kebab-case, SCREAMING_SNAKE_CASE
- **Number Formatting** - Currency, percentage, decimal precision, byte sizes
- **Date Formatting** - ISO, relative, localized formats
- **Pluralization** - Smart singular/plural handling with irregular words
- **Truncation** - Character and word-aware truncation with ellipsis
- **Sanitization** - HTML escape, URL encode, SQL escape, RegExp escape
- **Code Formatting** - JSON pretty print, syntax highlighting
- **i18n Support** - Locale-aware formatting for all operations
- **Extensible** - Custom formatter registry
- **Tree-Shakeable** - Import only what you need

## Installation

The formatting extension is built into the enzyme library:

```typescript
import { formattingExtension } from '@enzyme/extensions/built-in';
```

## Usage

### As an Extension

```typescript
import { EnzymeClient } from '@enzyme/core';
import { formattingExtension } from '@enzyme/extensions/built-in';

const enzyme = new EnzymeClient().$extends(formattingExtension);

// Now you have access to all formatting methods
const formatted = enzyme.$formatCurrency(1234.56, { currency: 'USD' });
// => '$1,234.56'
```

### Direct Import (Tree-Shakeable)

```typescript
import { formatCurrency, formatDate, pluralize } from '@enzyme/extensions/built-in';

// Only the imported functions are included in your bundle
const price = formatCurrency(1234.56, { currency: 'EUR', locale: 'de-DE' });
// => '1.234,56 €'
```

### Template Helpers

```typescript
import { fmt } from '@enzyme/extensions/built-in';

const name = 'hello-world';
const message = `Component name: ${fmt.pascal(name)}`;
// => 'Component name: HelloWorld'

const amount = 1234.56;
const price = `Price: ${fmt.currency(amount, 'USD')}`;
// => 'Price: $1,234.56'
```

## API Reference

### String Case Conversion

```typescript
import { toCamelCase, toPascalCase, toSnakeCase, toKebabCase, toScreamingSnakeCase } from '@enzyme/extensions/built-in';

toCamelCase('hello-world')           // 'helloWorld'
toPascalCase('hello-world')          // 'HelloWorld'
toSnakeCase('helloWorld')            // 'hello_world'
toKebabCase('helloWorld')            // 'hello-world'
toScreamingSnakeCase('helloWorld')   // 'HELLO_WORLD'

// Generic converter
import { toCase } from '@enzyme/extensions/built-in';
toCase('hello-world', 'pascal')      // 'HelloWorld'
```

### Number Formatting

```typescript
import { formatNumber, formatCurrency, formatPercentage, formatBytes } from '@enzyme/extensions/built-in';

// Basic number formatting
formatNumber(1234.56, { locale: 'en-US' })
// => '1,234.56'

// Currency
formatCurrency(1234.56, { currency: 'USD', locale: 'en-US' })
// => '$1,234.56'

formatCurrency(1234.56, { currency: 'EUR', locale: 'de-DE' })
// => '1.234,56 €'

// Percentage
formatPercentage(0.1234)
// => '12.34%'

formatPercentage(0.1234, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
// => '12%'

// Bytes
formatBytes(1024)        // '1.00 KB'
formatBytes(1048576)     // '1.00 MB'
formatBytes(1073741824)  // '1.00 GB'
```

### Date Formatting

```typescript
import { formatDate, formatRelativeTime } from '@enzyme/extensions/built-in';

const date = new Date('2024-01-15');

// Presets
formatDate(date, { format: 'short' })    // '1/15/24'
formatDate(date, { format: 'medium' })   // 'Jan 15, 2024'
formatDate(date, { format: 'long' })     // 'January 15, 2024'
formatDate(date, { format: 'full' })     // 'Monday, January 15, 2024'
formatDate(date, { format: 'iso' })      // '2024-01-15T00:00:00.000Z'

// Relative time
formatRelativeTime(new Date(Date.now() - 3600000))  // '1 hour ago'
formatRelativeTime(new Date(Date.now() + 86400000)) // 'in 1 day'

// Custom format
formatDate(date, {
  format: 'custom',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
// => 'Monday, January 15, 2024'

// Locale-aware
formatDate(date, { format: 'medium', locale: 'fr-FR' })
// => '15 janv. 2024'
```

### Pluralization

```typescript
import { pluralize, singularize } from '@enzyme/extensions/built-in';

// Basic pluralization
pluralize('person', 1)     // 'person'
pluralize('person', 2)     // 'people'
pluralize('child', 5)      // 'children'

// Include count
pluralize('item', 5, { inclusive: true })  // '5 items'

// Custom irregular forms
pluralize('cactus', 2, {
  irregulars: { cactus: 'cacti' }
})  // 'cacti'

// Singularization
singularize('people')      // 'person'
singularize('children')    // 'child'
singularize('data')        // 'data' (uncountable)
```

### Truncation

```typescript
import { truncate, truncateWords } from '@enzyme/extensions/built-in';

// Character truncation
truncate('Hello beautiful world', { length: 12 })
// => 'Hello bea...'

// Word-aware truncation
truncate('Hello beautiful world', {
  length: 12,
  wordBoundary: true
})
// => 'Hello...'

// Custom ellipsis
truncate('Hello world', { length: 8, ellipsis: '…' })
// => 'Hello…'

// Word truncation
truncateWords('Hello beautiful world', 2)
// => 'Hello beautiful...'
```

### Sanitization

```typescript
import { escapeHtml, stripHtml, encodeUrl, escapeSql } from '@enzyme/extensions/built-in';

// HTML escape
escapeHtml('<script>alert("XSS")</script>')
// => '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'

// Strip HTML tags
stripHtml('<p>Hello <strong>World</strong></p>')
// => 'Hello World'

// Keep specific tags
stripHtml('<p>Hello <strong>World</strong></p>', {
  allowedTags: ['strong']
})
// => 'Hello <strong>World</strong>'

// URL encoding
encodeUrl('hello world?foo=bar')
// => 'hello%20world%3Ffoo%3Dbar'

// SQL escape (use parameterized queries in production!)
escapeSql("'; DROP TABLE users--")
// => "'' DROP TABLE users--"
```

### Code Formatting

```typescript
import { formatJson, compactJson, highlightCode } from '@enzyme/extensions/built-in';

// Pretty print JSON
formatJson({ name: 'John', age: 30 })
// => '{\n  "name": "John",\n  "age": 30\n}'

// Custom indentation
formatJson({ name: 'John' }, 4)
// => '{\n    "name": "John"\n}'

// Compact JSON
compactJson('{\n  "name": "John"\n}')
// => '{"name":"John"}'

// Syntax highlighting (ANSI colors for terminal)
highlightCode('const x = 42;', 'javascript')
// Returns ANSI-colored string
```

### i18n Support

```typescript
import { setDefaultLocale, getDefaultLocale, formatNumber, formatDate } from '@enzyme/extensions/built-in';

// Set global locale
setDefaultLocale('de-DE');

// All formatting operations now use the default locale
formatNumber(1234.56)
// => '1.234,56'

formatDate(new Date(), { format: 'medium' })
// => '3. Dez. 2025'

// Get current locale
getDefaultLocale()
// => 'de-DE'

// Override per-operation
formatNumber(1234.56, { locale: 'en-US' })
// => '1,234.56'
```

### Custom Formatters

```typescript
import { formatterRegistry, format } from '@enzyme/extensions/built-in';

// Register custom formatter
formatterRegistry.register('phone', (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return value;
});

// Use custom formatter
format('phone', '1234567890')
// => '(123) 456-7890'

// List all formatters
formatterRegistry.list()
// => ['phone']

// Check if formatter exists
formatterRegistry.has('phone')
// => true

// Unregister
formatterRegistry.unregister('phone')
```

## Client Methods

When used as an extension, all methods are available on the enzyme client with `$` prefix:

```typescript
const enzyme = new EnzymeClient().$extends(formattingExtension);

// String case
enzyme.$toCamelCase('hello-world')
enzyme.$toPascalCase('hello-world')
enzyme.$toSnakeCase('helloWorld')
enzyme.$toKebabCase('helloWorld')

// Numbers
enzyme.$formatNumber(1234.56)
enzyme.$formatCurrency(1234.56, { currency: 'USD' })
enzyme.$formatPercentage(0.1234)
enzyme.$formatBytes(1024)

// Dates
enzyme.$formatDate(new Date())
enzyme.$formatRelativeTime(new Date())

// Text
enzyme.$pluralize('person', 2)
enzyme.$singularize('people')
enzyme.$truncate('Hello world', { length: 8 })

// Sanitization
enzyme.$escapeHtml('<script>alert("XSS")</script>')
enzyme.$stripHtml('<p>Hello</p>')
enzyme.$encodeUrl('hello world')

// Code
enzyme.$formatJson({ name: 'John' })
enzyme.$highlightCode('const x = 42;')

// i18n
enzyme.$setLocale('de-DE')
enzyme.$getLocale()

// Registry
enzyme.$registerFormatter('custom', (value) => value)
enzyme.$getFormatter('custom')
enzyme.$listFormatters()
```

## Template Usage

All formatters are available through the `fmt` object for use in template strings:

```typescript
import { fmt } from '@enzyme/extensions/built-in';

// Case conversion
`${fmt.camel('hello-world')}`      // 'helloWorld'
`${fmt.pascal('hello-world')}`     // 'HelloWorld'
`${fmt.snake('helloWorld')}`       // 'hello_world'
`${fmt.kebab('helloWorld')}`       // 'hello-world'
`${fmt.screaming('helloWorld')}`   // 'HELLO_WORLD'

// Numbers
`${fmt.number(1234.56)}`           // '1,234.56'
`${fmt.currency(1234.56, 'USD')}`  // '$1,234.56'
`${fmt.percent(0.1234)}`           // '12.34%'
`${fmt.bytes(1024)}`               // '1.00 KB'

// Dates
`${fmt.date(new Date())}`          // 'Dec 3, 2025'
`${fmt.relative(new Date())}`      // 'today'
`${fmt.iso(new Date())}`           // '2025-12-03T...'

// Text
`${fmt.truncate('Hello world', 8)}`                 // 'Hello...'
`${fmt.truncateWords('Hello world test', 2)}`       // 'Hello world...'
`${fmt.plural('person', 2)}`                        // 'people'
`${fmt.singular('people')}`                         // 'person'

// Sanitization
`${fmt.escape('<script>alert("XSS")</script>')}`    // '&lt;script&gt;...'
`${fmt.stripTags('<p>Hello</p>')}`                  // 'Hello'
`${fmt.urlEncode('hello world')}`                   // 'hello%20world'

// Code
`${fmt.json({ name: 'John' })}`                     // '{\n  "name": "John"\n}'
```

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import type {
  FormatOptions,
  NumberFormatOptions,
  CurrencyFormatOptions,
  DateFormatOptions,
  TruncateOptions,
  PluralizeOptions,
  SanitizeOptions,
  FormatterFunction,
  FormatterRegistry,
} from '@enzyme/extensions/built-in';

// Type-safe custom formatter
const myFormatter: FormatterFunction<string, string> = (value, options) => {
  return value.toUpperCase();
};

formatterRegistry.register('uppercase', myFormatter);
```

## Performance

- **Tree-shakeable**: Import only what you need
- **Zero dependencies**: Core formatting uses native JavaScript APIs
- **Locale-aware**: Leverages `Intl` API for performant i18n
- **Lazy evaluation**: Template helpers only execute when used

## Browser Support

- Modern browsers with ES2020+ support
- Intl API support (available in all modern browsers)
- Falls back gracefully when Intl APIs are not available

## Examples

### Component Name Formatting

```typescript
import { fmt } from '@enzyme/extensions/built-in';

const componentName = 'user-profile';

console.log(`
  File: ${fmt.pascal(componentName)}.tsx
  Class: ${fmt.pascal(componentName)}
  Hook: use${fmt.pascal(componentName)}
  Constant: ${fmt.screaming(componentName)}
  Route: /${fmt.kebab(componentName)}
`);

// Output:
// File: UserProfile.tsx
// Class: UserProfile
// Hook: useUserProfile
// Constant: USER_PROFILE
// Route: /user-profile
```

### Localized E-commerce Display

```typescript
import { formatCurrency, formatDate, formatPercentage } from '@enzyme/extensions/built-in';

const product = {
  price: 1299.99,
  discount: 0.15,
  releaseDate: new Date('2024-01-15'),
};

// US Display
console.log(`
  Price: ${formatCurrency(product.price, { currency: 'USD', locale: 'en-US' })}
  Save: ${formatPercentage(product.discount, { locale: 'en-US' })}
  Released: ${formatDate(product.releaseDate, { format: 'long', locale: 'en-US' })}
`);
// Price: $1,299.99
// Save: 15%
// Released: January 15, 2024

// German Display
console.log(`
  Preis: ${formatCurrency(product.price, { currency: 'EUR', locale: 'de-DE' })}
  Ersparnis: ${formatPercentage(product.discount, { locale: 'de-DE' })}
  Veröffentlicht: ${formatDate(product.releaseDate, { format: 'long', locale: 'de-DE' })}
`);
// Preis: 1.299,99 €
// Ersparnis: 15 %
// Veröffentlicht: 15. Januar 2024
```

### User-Friendly Messages

```typescript
import { pluralize, formatRelativeTime, truncate } from '@enzyme/extensions/built-in';

const notifications = 5;
const lastSeen = new Date(Date.now() - 3600000);
const message = 'This is a very long notification message that needs to be truncated';

console.log(`
  You have ${pluralize('notification', notifications, { inclusive: true })}
  Last seen: ${formatRelativeTime(lastSeen)}
  Preview: ${truncate(message, { length: 50, wordBoundary: true })}
`);
// You have 5 notifications
// Last seen: 1 hour ago
// Preview: This is a very long notification message...
```

## License

MIT
