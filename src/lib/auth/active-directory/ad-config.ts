/**
 * Active Directory Configuration
 *
 * Configuration types, defaults, and validation for AD authentication.
 * Supports Azure AD, Azure AD B2C, AD FS, and on-premises configurations.
 *
 * @module auth/active-directory/ad-config
 */

import type {
  ADConfig,
  ADProviderType,
  AzureADConfig,
  AzureADB2CConfig,
  ADFSConfig,
  OnPremisesADConfig,
  ADGroupMappingConfig,
  SSOConfig,
} from './types';
import type { Role } from '../types';

// =============================================================================
// Default Configurations
// =============================================================================

/**
 * Default Azure AD scopes for common operations.
 */
export const DEFAULT_AZURE_AD_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
] as const;

/**
 * Graph API scopes for group membership resolution.
 */
export const GRAPH_GROUP_SCOPES = [
  'GroupMember.Read.All',
  'Directory.Read.All',
] as const;

/**
 * Default Azure AD configuration.
 */
export const DEFAULT_AZURE_AD_CONFIG: Partial<AzureADConfig> = {
  authority: 'https://login.microsoftonline.com/common',
  scopes: [...DEFAULT_AZURE_AD_SCOPES],
  usePkce: true,
  cacheLocation: 'sessionStorage',
  usePopup: false,
  navigateToLoginRequestUrl: true,
};

/**
 * Default Azure AD B2C configuration.
 */
export const DEFAULT_AZURE_B2C_CONFIG: Partial<AzureADB2CConfig> = {
  scopes: ['openid', 'profile', 'offline_access'],
  usePkce: true,
  cacheLocation: 'sessionStorage',
  usePopup: false,
  navigateToLoginRequestUrl: true,
  policies: {
    signUpSignIn: 'B2C_1_SignUpSignIn',
    resetPassword: 'B2C_1_PasswordReset',
    editProfile: 'B2C_1_ProfileEdit',
  },
};

/**
 * Default AD FS configuration.
 */
export const DEFAULT_ADFS_CONFIG: Partial<ADFSConfig> = {
  scopes: ['openid', 'profile', 'email'],
  useWia: false,
};

/**
 * Default on-premises AD configuration.
 */
export const DEFAULT_ON_PREMISES_CONFIG: Partial<OnPremisesADConfig> = {
  useTls: true,
  userSearchFilter: '(&(objectClass=user)(sAMAccountName={username}))',
  groupSearchFilter: '(&(objectClass=group)(member={userDn}))',
  syncInterval: 300000, // 5 minutes
};

/**
 * Default SSO configuration.
 */
export const DEFAULT_SSO_CONFIG: SSOConfig = {
  crossTabSync: true,
  storagePrefix: 'ad_sso_',
  sessionTimeout: 28800000, // 8 hours
  trackActivity: true,
  activityCheckInterval: 60000, // 1 minute
  autoExtendSession: true,
};

/**
 * Default group mapping configuration.
 */
export const DEFAULT_GROUP_MAPPING_CONFIG: ADGroupMappingConfig = {
  mappings: [],
  defaultRole: 'guest' as Role,
  defaultPermissions: [],
  resolveNestedGroups: false,
  cacheDuration: 300000, // 5 minutes
  fallbackBehavior: 'use-claims',
};

/**
 * Default AD configuration.
 */
export const DEFAULT_AD_CONFIG: Partial<ADConfig> = {
  debug: false,
  multiTenant: false,
  sessionTimeout: 28800000, // 8 hours
  silentRefresh: true,
  featureFlag: 'ad-authentication',
};

// =============================================================================
// Configuration Builders
// =============================================================================

/**
 * Create Azure AD configuration with defaults.
 *
 * @param config - Partial Azure AD configuration
 * @returns Complete Azure AD configuration
 */
export function createAzureADConfig(
  config: Partial<AzureADConfig> & Pick<AzureADConfig, 'tenantId' | 'clientId' | 'redirectUri'>
): AzureADConfig {
  return {
    ...DEFAULT_AZURE_AD_CONFIG,
    ...config,
    authority: config.authority ?? `https://login.microsoftonline.com/${config.tenantId}`,
    scopes: config.scopes ?? [...DEFAULT_AZURE_AD_SCOPES],
  };
}

/**
 * Create Azure AD B2C configuration with defaults.
 *
 * @param config - Partial Azure AD B2C configuration
 * @returns Complete Azure AD B2C configuration
 */
export function createAzureB2CConfig(
  config: Partial<AzureADB2CConfig> &
    Pick<AzureADB2CConfig, 'tenantId' | 'clientId' | 'redirectUri' | 'b2cTenantName'>
): AzureADB2CConfig {
  const policies = {
    ...DEFAULT_AZURE_B2C_CONFIG.policies,
    ...config.policies,
  } as AzureADB2CConfig['policies'];

  const authority = config.authority ??
    `https://${config.b2cTenantName}.b2clogin.com/${config.b2cTenantName}.onmicrosoft.com/${policies.signUpSignIn}`;

  const result: AzureADB2CConfig = {
    ...DEFAULT_AZURE_B2C_CONFIG,
    ...config,
    policies,
    authority,
    knownAuthorities: config.knownAuthorities ?? [`${config.b2cTenantName}.b2clogin.com`],
    scopes: config.scopes ?? DEFAULT_AZURE_B2C_CONFIG.scopes ?? [],
  };
  return result;
}

/**
 * Create AD FS configuration with defaults.
 *
 * @param config - Partial AD FS configuration
 * @returns Complete AD FS configuration
 */
export function createADFSConfig(
  config: Partial<ADFSConfig> & Pick<ADFSConfig, 'serverUrl' | 'clientId' | 'redirectUri'>
): ADFSConfig {
  return {
    ...DEFAULT_ADFS_CONFIG,
    ...config,
    scopes: config.scopes ?? ['openid', 'profile', 'email'],
  };
}

/**
 * Create on-premises AD configuration with defaults.
 *
 * @param config - Partial on-premises configuration
 * @returns Complete on-premises configuration
 */
export function createOnPremisesConfig(
  config: Partial<OnPremisesADConfig> & Pick<OnPremisesADConfig, 'ldapUrl' | 'baseDn' | 'bindDn' | 'bindPassword'>
): OnPremisesADConfig {
  return {
    ...DEFAULT_ON_PREMISES_CONFIG,
    ...config,
    useTls: config.useTls ?? true,
  };
}

/**
 * Create complete AD configuration with appropriate defaults.
 *
 * @param providerType - The AD provider type
 * @param providerConfig - Provider-specific configuration
 * @param options - Additional options
 * @returns Complete AD configuration
 */
export function createADConfig<T extends ADProviderType>(
  providerType: T,
  providerConfig: T extends 'azure-ad'
    ? Partial<AzureADConfig> & Pick<AzureADConfig, 'tenantId' | 'clientId' | 'redirectUri'>
    : T extends 'azure-ad-b2c'
    ? Partial<AzureADB2CConfig> & Pick<AzureADB2CConfig, 'tenantId' | 'clientId' | 'redirectUri' | 'b2cTenantName'>
    : T extends 'adfs'
    ? Partial<ADFSConfig> & Pick<ADFSConfig, 'serverUrl' | 'clientId' | 'redirectUri'>
    : T extends 'on-premises'
    ? Partial<OnPremisesADConfig> & Pick<OnPremisesADConfig, 'ldapUrl' | 'baseDn' | 'bindDn' | 'bindPassword'>
    : Record<string, unknown>,
  options?: Partial<Omit<ADConfig, 'providerType' | 'azure' | 'azureB2C' | 'adfs' | 'onPremises'>>
): ADConfig {
  const baseConfig: ADConfig = {
    ...DEFAULT_AD_CONFIG,
    ...options,
    providerType,
  };

  switch (providerType) {
    case 'azure-ad':
      baseConfig.azure = createAzureADConfig(
        providerConfig as Partial<AzureADConfig> & Pick<AzureADConfig, 'tenantId' | 'clientId' | 'redirectUri'>
      );
      break;
    case 'azure-ad-b2c':
      baseConfig.azureB2C = createAzureB2CConfig(
        providerConfig as Partial<AzureADB2CConfig> &
          Pick<AzureADB2CConfig, 'tenantId' | 'clientId' | 'redirectUri' | 'b2cTenantName'>
      );
      break;
    case 'adfs':
      baseConfig.adfs = createADFSConfig(
        providerConfig as Partial<ADFSConfig> & Pick<ADFSConfig, 'serverUrl' | 'clientId' | 'redirectUri'>
      );
      break;
    case 'on-premises':
      baseConfig.onPremises = createOnPremisesConfig(
        providerConfig as Partial<OnPremisesADConfig> &
          Pick<OnPremisesADConfig, 'ldapUrl' | 'baseDn' | 'bindDn' | 'bindPassword'>
      );
      break;
    case 'custom':
      baseConfig.custom = providerConfig as Record<string, unknown>;
      break;
  }

  return baseConfig;
}

// =============================================================================
// Configuration Validation
// =============================================================================

/**
 * Validation result for configuration checking.
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of warnings (non-blocking issues) */
  warnings: string[];
}

/**
 * Validate Azure AD configuration.
 */
function validateAzureADConfig(config: AzureADConfig | undefined): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    errors.push('Azure AD configuration is required');
    return { valid: false, errors, warnings };
  }

  if (!config.tenantId) {
    errors.push('Azure AD tenantId is required');
  } else if (!/^[a-f0-9-]{36}$|^[a-zA-Z0-9.-]+$/i.test(config.tenantId)) {
    errors.push('Azure AD tenantId must be a valid GUID or domain');
  }

  if (!config.clientId) {
    errors.push('Azure AD clientId is required');
  } else if (!/^[a-f0-9-]{36}$/i.test(config.clientId)) {
    errors.push('Azure AD clientId must be a valid GUID');
  }

  if (!config.redirectUri) {
    errors.push('Azure AD redirectUri is required');
  } else if (!isValidUrl(config.redirectUri)) {
    errors.push('Azure AD redirectUri must be a valid URL');
  }

  if (config.scopes == null || config.scopes.length === 0) {
    warnings.push('No scopes specified, using default scopes');
  }

  if (config.clientSecret != null && config.clientSecret !== '') {
    warnings.push('Client secret should not be used in browser applications');
  }

  if (config.cacheLocation === 'localStorage') {
    warnings.push('localStorage cache may persist across sessions, consider using sessionStorage');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate Azure AD B2C configuration.
 */
function validateAzureB2CConfig(config: AzureADB2CConfig | undefined): ConfigValidationResult {
  const baseResult = validateAzureADConfig(config);
  const errors = [...baseResult.errors];
  const warnings = [...baseResult.warnings];

  if (config) {
    if (!config.b2cTenantName) {
      errors.push('Azure AD B2C tenant name is required');
    }

    if (config.policies?.signUpSignIn == null || config.policies.signUpSignIn === '') {
      errors.push('Azure AD B2C signUpSignIn policy is required');
    }

    if (config.knownAuthorities == null || config.knownAuthorities.length === 0) {
      errors.push('Azure AD B2C known authorities are required');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate AD FS configuration.
 */
function validateADFSConfig(config: ADFSConfig | undefined): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    errors.push('AD FS configuration is required');
    return { valid: false, errors, warnings };
  }

  if (!config.serverUrl) {
    errors.push('AD FS serverUrl is required');
  } else if (!isValidUrl(config.serverUrl)) {
    errors.push('AD FS serverUrl must be a valid URL');
  }

  if (!config.clientId) {
    errors.push('AD FS clientId is required');
  }

  if (!config.redirectUri) {
    errors.push('AD FS redirectUri is required');
  } else if (!isValidUrl(config.redirectUri)) {
    errors.push('AD FS redirectUri must be a valid URL');
  }

  if (config.useWia === true) {
    warnings.push('Windows Integrated Authentication requires browser and network support');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate on-premises AD configuration.
 */
function validateOnPremisesConfig(config: OnPremisesADConfig | undefined): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    errors.push('On-premises AD configuration is required');
    return { valid: false, errors, warnings };
  }

  if (!config.ldapUrl) {
    errors.push('LDAP URL is required');
  } else if (!config.ldapUrl.startsWith('ldap://') && !config.ldapUrl.startsWith('ldaps://')) {
    errors.push('LDAP URL must start with ldap:// or ldaps://');
  }

  if (!config.baseDn) {
    errors.push('Base DN is required');
  }

  if (!config.bindDn) {
    errors.push('Bind DN is required');
  }

  if (!config.bindPassword) {
    errors.push('Bind password is required');
  }

  if (!config.useTls && config.ldapUrl?.startsWith('ldap://')) {
    warnings.push('LDAP connection without TLS is insecure');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate complete AD configuration.
 *
 * @param config - The AD configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateADConfig(config: ADConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.providerType) {
    errors.push('Provider type is required');
    return { valid: false, errors, warnings };
  }

  let providerResult: ConfigValidationResult;

  switch (config.providerType) {
    case 'azure-ad':
      providerResult = validateAzureADConfig(config.azure);
      break;
    case 'azure-ad-b2c':
      providerResult = validateAzureB2CConfig(config.azureB2C);
      break;
    case 'adfs':
      providerResult = validateADFSConfig(config.adfs);
      break;
    case 'on-premises':
      providerResult = validateOnPremisesConfig(config.onPremises);
      break;
    case 'custom':
      if (!config.custom || Object.keys(config.custom).length === 0) {
        warnings.push('Custom provider configuration is empty');
      }
      providerResult = { valid: true, errors: [], warnings: [] };
      break;
    default:
      errors.push(`Unknown provider type: ${String(config.providerType)}`);
      providerResult = { valid: false, errors: [], warnings: [] };
  }

  errors.push(...providerResult.errors);
  warnings.push(...providerResult.warnings);

  if (config.sessionTimeout != null && config.sessionTimeout < 60000) {
    warnings.push('Session timeout less than 1 minute may cause frequent re-authentication');
  }

  if (config.debug === true) {
    warnings.push('Debug mode is enabled - disable in production');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a string is a valid URL.
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the active provider configuration from ADConfig.
 *
 * @param config - The AD configuration
 * @returns The active provider configuration or null
 */
export function getActiveProviderConfig(config: ADConfig):
  | AzureADConfig
  | AzureADB2CConfig
  | ADFSConfig
  | OnPremisesADConfig
  | Record<string, unknown>
  | null {
  switch (config.providerType) {
    case 'azure-ad':
      return config.azure ?? null;
    case 'azure-ad-b2c':
      return config.azureB2C ?? null;
    case 'adfs':
      return config.adfs ?? null;
    case 'on-premises':
      return config.onPremises ?? null;
    case 'custom':
      return config.custom ?? null;
    default:
      return null;
  }
}

/**
 * Get the authority URL for the configured provider.
 *
 * @param config - The AD configuration
 * @returns The authority URL or null
 */
export function getAuthorityUrl(config: ADConfig): string | null {
  switch (config.providerType) {
    case 'azure-ad':
      return config.azure?.authority ?? null;
    case 'azure-ad-b2c':
      return config.azureB2C?.authority ?? null;
    case 'adfs':
      return config.adfs?.serverUrl ?? null;
    default:
      return null;
  }
}

/**
 * Get the configured scopes for the provider.
 *
 * @param config - The AD configuration
 * @returns Array of scopes
 */
export function getConfiguredScopes(config: ADConfig): string[] {
  switch (config.providerType) {
    case 'azure-ad':
      return config.azure?.scopes ?? [...DEFAULT_AZURE_AD_SCOPES];
    case 'azure-ad-b2c':
      return config.azureB2C?.scopes ?? ['openid', 'profile', 'offline_access'];
    case 'adfs':
      return config.adfs?.scopes ?? ['openid', 'profile', 'email'];
    default:
      return ['openid', 'profile'];
  }
}

/**
 * Merge scopes with Graph API scopes for group resolution.
 *
 * @param baseScopes - The base scopes
 * @param includeGroupScopes - Whether to include group-related scopes
 * @returns Merged scopes array
 */
export function mergeWithGraphScopes(
  baseScopes: string[],
  includeGroupScopes = false
): string[] {
  const scopes = new Set(baseScopes);

  if (includeGroupScopes) {
    GRAPH_GROUP_SCOPES.forEach(scope => scopes.add(scope));
  }

  return Array.from(scopes);
}
