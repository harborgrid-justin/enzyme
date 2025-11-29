# Secure Storage

Enterprise-grade encrypted client-side storage with automatic key rotation, TTL support, and secure data wiping for @missionfabric-js/enzyme.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Encrypted Storage](#encrypted-storage)
- [Storage Backends](#storage-backends)
- [Key Management](#key-management)
- [TTL and Expiration](#ttl-and-expiration)
- [Secure Wiping](#secure-wiping)
- [React Integration](#react-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Secure Storage provides encrypted client-side storage using the Web Crypto API, protecting sensitive data from XSS attacks and unauthorized access.

### Key Features

- **AES-GCM Encryption**: Industry-standard encryption for stored data
- **Automatic Key Generation**: Cryptographically secure encryption keys
- **Key Rotation**: Periodic key rotation for enhanced security
- **TTL Support**: Automatic data expiration
- **Multiple Backends**: localStorage, sessionStorage, or IndexedDB
- **Secure Wiping**: Cryptographic data deletion
- **React Hooks**: Easy integration with React components
- **Type Safety**: Full TypeScript support

## Quick Start

### Enable Secure Storage

```tsx
import { SecurityProvider } from '@missionfabric-js/enzyme/security';

function App() {
  return (
    <SecurityProvider
      config={{
        storage: {
          enableEncryption: true,
          storageBackend: 'sessionStorage',
          keyRotationInterval: 86400000, // 24 hours
        },
      }}
      encryptionKey={process.env.STORAGE_ENCRYPTION_KEY}
    >
      <YourApp />
    </SecurityProvider>
  );
}
```

### Use Secure Storage Hook

```tsx
import { useSecureStorage } from '@/lib/security';

function APIKeyManager() {
  const [apiKey, setApiKey] = useSecureStorage('api_key', '', {
    ttl: 3600000, // 1 hour
    encrypt: true,
  });

  return (
    <div>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="API Key"
      />
    </div>
  );
}
```

### Manual Secure Storage

```tsx
import { useSecurityContext } from '@/lib/security';

function Settings() {
  const { getSecureStorage } = useSecurityContext();
  const [token, setToken] = useState('');

  useEffect(() => {
    const storage = getSecureStorage();
    const savedToken = storage.getItem('auth-token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, [getSecureStorage]);

  const saveToken = (newToken) => {
    const storage = getSecureStorage();
    storage.setItem('auth-token', newToken);
    setToken(newToken);
  };

  return (
    <input
      type="password"
      value={token}
      onChange={(e) => saveToken(e.target.value)}
    />
  );
}
```

## Encrypted Storage

### Creating Secure Storage

```typescript
import { createSecureLocalStorage, createSecureSessionStorage } from '@/lib/security';

// Encrypted localStorage
const secureLocal = createSecureLocalStorage({
  encryptionKey: 'your-encryption-key',
  keyRotationInterval: 86400000, // 24 hours
});

// Encrypted sessionStorage
const secureSession = createSecureSessionStorage({
  encryptionKey: 'your-encryption-key',
});

// Store encrypted data
secureLocal.setItem('secret', 'sensitive-data');

// Retrieve and decrypt data
const secret = secureLocal.getItem('secret');
```

### Secure Storage Class

```typescript
import { SecureStorage } from '@/lib/security';

const storage = new SecureStorage({
  backend: 'localStorage',
  encryptionKey: generateEncryptionKey(),
  namespace: 'myApp',
  ttl: 3600000, // Default TTL: 1 hour
});

// Store data
storage.setItem('key', 'value');

// Retrieve data
const value = storage.getItem('key');

// Remove data
storage.removeItem('key');

// Clear all data
storage.clear();

// Get all keys
const keys = storage.keys();
```

### Initialization

```typescript
import { initSecureStorage } from '@/lib/security';

const storage = initSecureStorage({
  backend: 'sessionStorage',
  encryptionKey: process.env.ENCRYPTION_KEY,
  namespace: 'app',
  config: {
    keyRotationInterval: 86400000,
    autoCleanup: true,
    cleanupInterval: 3600000,
  },
});
```

## Storage Backends

### localStorage

Persistent storage that survives browser restarts:

```typescript
import { createSecureLocalStorage } from '@/lib/security';

const storage = createSecureLocalStorage({
  encryptionKey: 'key',
  ttl: 604800000, // 7 days
});

storage.setItem('rememberMe', 'true');
```

### sessionStorage

Session-only storage (cleared on tab close):

```typescript
import { createSecureSessionStorage } from '@/lib/security';

const storage = createSecureSessionStorage({
  encryptionKey: 'key',
});

storage.setItem('sessionData', 'temporary');
```

### IndexedDB (Coming Soon)

Large data storage with better performance:

```typescript
import { createSecureIndexedDB } from '@/lib/security';

const storage = await createSecureIndexedDB({
  dbName: 'secureDB',
  storeName: 'secrets',
  encryptionKey: 'key',
});

await storage.setItem('largeData', complexObject);
```

## Key Management

### Generating Encryption Keys

```typescript
import { generateEncryptionKey } from '@/lib/security';

// Generate cryptographically secure key
const key = generateEncryptionKey();

// Generate key with specific length
const key256 = generateEncryptionKey(256);

// Use in storage
const storage = createSecureLocalStorage({
  encryptionKey: key,
});
```

### Key Rotation

```typescript
import { SecureStorage } from '@/lib/security';

const storage = new SecureStorage({
  backend: 'localStorage',
  encryptionKey: initialKey,
  keyRotationInterval: 86400000, // Rotate every 24 hours
});

// Manual key rotation
const newKey = generateEncryptionKey();
storage.rotateKey(newKey);

// Automatic rotation happens in background
// Old data is re-encrypted with new key
```

### Key Storage

```typescript
// NEVER store encryption key in localStorage
// localStorage.setItem('encryptionKey', key); // ❌ INSECURE

// Good: Generate key from user password
import { deriveKeyFromPassword } from '@/lib/security';

const key = await deriveKeyFromPassword(
  userPassword,
  'salt', // Use unique salt per user
  100000  // Iterations
);

// Good: Store key in memory only
let encryptionKey = generateEncryptionKey();

// Good: Retrieve key from secure backend
const key = await fetch('/api/encryption-key', {
  headers: { 'Authorization': `Bearer ${authToken}` },
}).then(r => r.text());
```

## TTL and Expiration

### Setting TTL

```typescript
// Per-item TTL
storage.setItem('session', 'data', {
  ttl: 1800000, // 30 minutes
});

// Default TTL for all items
const storage = new SecureStorage({
  backend: 'localStorage',
  encryptionKey: key,
  ttl: 3600000, // 1 hour default
});
```

### Checking Expiration

```typescript
const value = storage.getItem('key');

if (value === null) {
  console.log('Item expired or does not exist');
}

// Get item metadata
const meta = storage.getItemMetadata('key');
console.log('Expires at:', new Date(meta.expiresAt));
console.log('Is expired:', meta.isExpired);
```

### Auto-Cleanup

```typescript
const storage = new SecureStorage({
  backend: 'localStorage',
  encryptionKey: key,
  config: {
    autoCleanup: true,
    cleanupInterval: 3600000, // Cleanup every hour
  },
});

// Manual cleanup
storage.cleanup(); // Remove expired items
```

## Secure Wiping

### Secure Delete

```typescript
import { secureWipe } from '@/lib/security';

// Securely delete data (cryptographic wiping)
secureWipe('auth-token');

// Wipe multiple keys
secureWipe(['token1', 'token2', 'secret']);

// Wipe with callback
secureWipe('sensitive-data', {
  onComplete: () => {
    console.log('Data securely wiped');
  },
});
```

### Clearing Storage

```typescript
// Clear all items (secure wipe)
storage.clear();

// Clear with pattern
storage.clearPattern('session:*');

// Clear namespace
storage.clearNamespace('auth');
```

### Secure Deletion on Logout

```tsx
import { useAuth } from '@/lib/auth';
import { useSecurityContext } from '@/lib/security';

function LogoutButton() {
  const { logout } = useAuth();
  const { getSecureStorage } = useSecurityContext();

  const handleLogout = async () => {
    const storage = getSecureStorage();

    // Securely wipe sensitive data
    storage.removeItem('auth-token');
    storage.removeItem('refresh-token');
    storage.removeItem('user-data');

    // Logout
    await logout();
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

## React Integration

### useSecureStorage Hook

```tsx
import { useSecureStorage } from '@/lib/security';

function UserPreferences() {
  const [theme, setTheme] = useSecureStorage('theme', 'light');
  const [language, setLanguage] = useSecureStorage('language', 'en');

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="es">Spanish</option>
      </select>
    </div>
  );
}
```

### With TTL

```tsx
import { useSecureStorage } from '@/lib/security';

function TemporaryData() {
  const [data, setData] = useSecureStorage('temp-data', '', {
    ttl: 300000, // 5 minutes
    onExpire: () => {
      console.log('Data expired');
    },
  });

  return (
    <input
      value={data}
      onChange={(e) => setData(e.target.value)}
    />
  );
}
```

### Complex Data

```tsx
import { useSecureStorage } from '@/lib/security';

interface UserSettings {
  theme: string;
  notifications: boolean;
  privacy: {
    analytics: boolean;
    cookies: boolean;
  };
}

function Settings() {
  const [settings, setSettings] = useSecureStorage<UserSettings>(
    'user-settings',
    {
      theme: 'light',
      notifications: true,
      privacy: {
        analytics: false,
        cookies: true,
      },
    }
  );

  return (
    <div>
      <select
        value={settings.theme}
        onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={settings.notifications}
          onChange={(e) =>
            setSettings({ ...settings, notifications: e.target.checked })
          }
        />
        Enable notifications
      </label>
    </div>
  );
}
```

## Best Practices

### 1. Use HTTPS

Encryption is only effective over HTTPS:

```typescript
if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
  console.error('Secure storage requires HTTPS');
  // Fall back to non-encrypted storage or show warning
}
```

### 2. Never Store Passwords

```typescript
// ❌ NEVER store raw passwords
storage.setItem('password', userPassword);

// ✅ Store derived keys or tokens
const derivedKey = await deriveKeyFromPassword(userPassword);
storage.setItem('derived-key', derivedKey);
```

### 3. Use Appropriate TTLs

```typescript
// Session data
const session = useSecureStorage('session', '', {
  ttl: 1800000, // 30 minutes
});

// Remember me
const rememberMe = useSecureStorage('remember-me', '', {
  ttl: 2592000000, // 30 days
});

// Temporary cache
const cache = useSecureStorage('cache', '', {
  ttl: 300000, // 5 minutes
});
```

### 4. Clear on Logout

```tsx
const handleLogout = () => {
  const storage = getSecureStorage();

  // Clear sensitive data
  storage.removeItem('auth-token');
  storage.removeItem('user-data');
  storage.removeItem('api-keys');

  // Or clear everything
  storage.clear();
};
```

### 5. Use Namespaces

```typescript
const authStorage = new SecureStorage({
  namespace: 'auth',
  backend: 'sessionStorage',
  encryptionKey: key,
});

const userStorage = new SecureStorage({
  namespace: 'user',
  backend: 'localStorage',
  encryptionKey: key,
});

// Isolated storage
authStorage.setItem('token', 'abc');
userStorage.setItem('token', 'xyz');
```

### 6. Monitor Storage Size

```typescript
const storageSize = storage.getSize();
const maxSize = 5 * 1024 * 1024; // 5MB

if (storageSize > maxSize) {
  console.warn('Storage approaching limit');
  storage.cleanup(); // Remove expired items
}
```

## Troubleshooting

### Issue: Web Crypto API Not Available

**Solution:** Ensure HTTPS is enabled:

```typescript
if (!window.crypto || !window.crypto.subtle) {
  console.error('Web Crypto API requires HTTPS');
  // Fall back to non-encrypted storage
}
```

### Issue: Storage Quota Exceeded

**Solution:** Implement cleanup:

```typescript
try {
  storage.setItem('key', 'value');
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.warn('Storage quota exceeded, cleaning up');
    storage.cleanup(); // Remove expired items
    storage.setItem('key', 'value'); // Retry
  }
}
```

### Issue: Data Not Persisting

**Solution:** Check storage backend and TTL:

```typescript
// Check if using sessionStorage (cleared on tab close)
console.log('Backend:', storage.backend);

// Check TTL
const meta = storage.getItemMetadata('key');
console.log('Expires at:', new Date(meta.expiresAt));
```

### Issue: Encryption Key Lost

**Solution:** Implement key recovery:

```typescript
// Option 1: Store key derivation parameters
const salt = generateSalt();
const key = await deriveKeyFromPassword(userPassword, salt);

localStorage.setItem('keySalt', salt); // Salt is not sensitive

// Option 2: Backend key storage
const key = await fetchEncryptionKey();

// Option 3: Warn user about data loss
if (!encryptionKey) {
  alert('Encryption key lost. Stored data cannot be recovered.');
  storage.clear();
}
```

## Security Considerations

### Encryption Algorithms

The secure storage system uses:

- **Algorithm**: AES-GCM
- **Key Length**: 256 bits
- **IV Length**: 96 bits (12 bytes)
- **Tag Length**: 128 bits (16 bytes)

### Attack Mitigation

1. **XSS Protection**: Encrypted data is useless to attackers without the key
2. **Key Rotation**: Periodic key rotation limits exposure
3. **Secure Deletion**: Cryptographic wiping prevents data recovery
4. **TTL**: Automatic expiration reduces attack window

### Limitations

1. **Not a Substitute for Server Security**: Client-side encryption can be bypassed
2. **Key Management**: Encryption is only as strong as key protection
3. **Browser DevTools**: Data visible in memory during use
4. **XSS Vulnerabilities**: Compromised page can access decrypted data

## See Also

- [CSRF Protection](./CSRF.md) - Cross-site request forgery protection
- [XSS Prevention](./XSS.md) - Cross-site scripting protection
- [Security Overview](./README.md) - Security module overview
- [Auth Module](../auth/README.md) - Authentication with secure storage
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

**Version:** 3.0.0
**Last Updated:** 2025-11-29
