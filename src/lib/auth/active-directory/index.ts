/**
 * Active Directory Authentication Module
 *
 * Enterprise-grade Active Directory integration for React applications.
 * Supports Azure AD, Azure AD B2C, AD FS, and on-premises configurations.
 *
 * @module auth/active-directory
 *
 * @example
 * ```tsx
 * // Basic Azure AD setup
 * import {
 *   ADProvider,
 *   useActiveDirectory,
 *   createADConfig,
 * } from '@/lib/auth/active-directory';
 *
 * // Create configuration
 * const adConfig = createADConfig('azure-ad', {
 *   tenantId: process.env.AZURE_AD_TENANT_ID,
 *   clientId: process.env.AZURE_AD_CLIENT_ID,
 *   redirectUri: window.location.origin,
 * });
 *
 * // Wrap your app
 * function App() {
 *   return (
 *     <ADProvider config={adConfig} enableSSO>
 *       <MyApplication />
 *     </ADProvider>
 *   );
 * }
 *
 * // Use in components
 * function UserProfile() {
 *   const {
 *     user,
 *     isAuthenticated,
 *     login,
 *     logout,
 *     isInGroup,
 *     hasPermission,
 *   } = useActiveDirectory();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={() => login()}>Sign in</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user?.displayName}</h1>
 *       {isInGroup('sg-app-admins') && <AdminPanel />}
 *       <button onClick={() => logout()}>Sign out</button>
 *     </div>
 *   );
 * }
 * ```
 */

// =============================================================================
// Provider & Context
// =============================================================================

export { ADProvider, ADContext } from './ad-provider';
export type { ADProviderProps } from './ad-provider';

// =============================================================================
// Hooks
// =============================================================================

export {
  useActiveDirectory,
  useADGroups,
  useADRoles,
  useADPermissions,
  useADAttributes,
  useADAuth,
  useADTokens,
} from './useActiveDirectory';
export type { UseActiveDirectoryReturn } from './useActiveDirectory';

// =============================================================================
// Configuration
// =============================================================================

export {
  createADConfig,
  createAzureADConfig,
  createAzureB2CConfig,
  createADFSConfig,
  createOnPremisesConfig,
  validateADConfig,
  getAuthorityUrl,
  getConfiguredScopes,
  mergeWithGraphScopes,
  DEFAULT_AZURE_AD_CONFIG,
  DEFAULT_AZURE_B2C_CONFIG,
  DEFAULT_ADFS_CONFIG,
  DEFAULT_ON_PREMISES_CONFIG,
  DEFAULT_SSO_CONFIG,
  DEFAULT_GROUP_MAPPING_CONFIG,
  DEFAULT_AD_CONFIG,
  DEFAULT_AZURE_AD_SCOPES,
  GRAPH_GROUP_SCOPES,
} from './ad-config';
export type { ConfigValidationResult } from './ad-config';

// =============================================================================
// AD Client
// =============================================================================

export { ADClient, createADClient, GraphAPIClientError, GRAPH_ENDPOINTS } from './ad-client';

// =============================================================================
// Group Mapping
// =============================================================================

export {
  ADGroupMapper,
  createGroupMapper,
  mergeGroupMappings,
  validateGroupMapping,
  GROUP_MAPPING_PRESETS,
} from './ad-groups';
export type { GroupMappingResult } from './ad-groups';

// =============================================================================
// Attribute Mapping
// =============================================================================

export {
  ADAttributeMapper,
  createAttributeMapper,
  createExtensionMapping,
  attributeTransformers,
  attributeValidators,
  DEFAULT_ATTRIBUTE_MAPPINGS,
  EXTENDED_ATTRIBUTE_MAPPINGS,
  HEALTHCARE_ATTRIBUTE_MAPPINGS,
} from './ad-attributes';
export type {
  AttributeMapping,
  AttributeMappingConfig,
  AttributeMappingResult,
  AttributeTransformer,
  AttributeValidator,
} from './ad-attributes';

// =============================================================================
// Token Handler
// =============================================================================

export { ADTokenHandler, createTokenHandler } from './ad-token-handler';
export type { TokenHandlerOptions, AcquisitionOptions } from './ad-token-handler';

// =============================================================================
// SSO Support
// =============================================================================

export { SSOManager, createSSOManager, CrossDomainSSO, createCrossDomainSSO } from './ad-sso';
export type {
  SSOEventType,
  SSOBroadcastMessage,
  SSOEventHandler,
  SSOManagerOptions,
} from './ad-sso';

// =============================================================================
// Types
// =============================================================================

export type {
  // Provider Types
  ADProviderType,
  ADGrantType,
  ADPromptBehavior,
  // Configuration Types
  ADConfig,
  AzureADConfig,
  AzureADB2CConfig,
  ADFSConfig,
  OnPremisesADConfig,
  // User & Token Types
  ADUser,
  ADUserAttributes,
  ADGroup,
  ADTokens,
  TokenAcquisitionRequest,
  TokenRefreshResult,
  // Group Mapping Types
  ADGroupRoleMapping,
  ADGroupMappingConfig,
  // State & Context Types
  ADAuthState,
  ADAuthError,
  ADContextValue,
  ADLogoutOptions,
  // SSO Types
  SSOSession,
  SSOConfig,
  // Graph API Types
  GraphAPIRequest,
  GraphAPIResponse,
  GraphAPIError,
  // Event Types
  ADAuthEvent,
  ADAuthEventHandler,
  ADEventEmitter,
} from './types';
