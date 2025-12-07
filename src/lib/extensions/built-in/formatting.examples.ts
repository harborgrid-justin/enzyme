/**
 * @file Formatting Extension Usage Examples
 * @description Demonstrates all features of the formatting extension
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  fmt,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  toScreamingSnakeCase,
  formatCurrency,
  formatPercentage,
  formatDate,
  formatRelativeTime,
  pluralize,
  truncate,
  escapeHtml,
  stripHtml,
  formatJson,
  formatterRegistry,
  format,
} from './formatting.js';

// Component name formatting example
export function exampleComponentNaming() {
  const componentName = 'user-profile-card';

  console.log('Component Name Formatting:');
  console.log(`  Original: ${componentName}`);
  console.log(`  PascalCase: ${toPascalCase(componentName)}`);
  console.log(`  camelCase: ${toCamelCase(componentName)}`);
  console.log(`  snake_case: ${toSnakeCase(componentName)}`);
  console.log(`  kebab-case: ${toKebabCase(componentName)}`);
  console.log(`  SCREAMING_SNAKE: ${toScreamingSnakeCase(componentName)}`);
}

// E-commerce display example
export function exampleEcommerce() {
  const product = {
    name: 'Wireless Headphones',
    price: 299.99,
    originalPrice: 399.99,
    discount: (399.99 - 299.99) / 399.99,
    stock: 5,
    releaseDate: new Date('2024-01-15'),
  };

  console.log('E-commerce Product:');
  console.log(`  Price: ${formatCurrency(product.price, { currency: 'USD' })}`);
  console.log(`  Save: ${formatPercentage(product.discount)}`);
  console.log(`  ${pluralize('item', product.stock, { inclusive: true })} in stock`);
  console.log(`  Released: ${formatDate(product.releaseDate, { format: 'long' })}`);
}

// Multi-locale support example
export function exampleI18n() {
  const amount = 1234.56;
  const date = new Date('2024-06-15');

  console.log('US: ' + formatCurrency(amount, { currency: 'USD', locale: 'en-US' }));
  console.log('DE: ' + formatCurrency(amount, { currency: 'EUR', locale: 'de-DE' }));
  console.log('JP: ' + formatCurrency(amount, { currency: 'JPY', locale: 'ja-JP' }));
}

// Template helpers example
export function exampleTemplateHelpers() {
  const name = 'hello-world';
  console.log(`PascalCase: ${fmt.pascal(name)}`);
  console.log(`camelCase: ${fmt.camel(name)}`);
  console.log(`Currency: ${fmt.currency(1234.56, 'USD')}`);
  console.log(`Bytes: ${fmt.bytes(1024 * 1024)}`);
}

// Custom formatters example
export function exampleCustomFormatters() {
  // Register phone formatter
  formatterRegistry.register('phone', (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : value;
  });

  console.log('Phone: ' + format('phone', '1234567890'));
}
