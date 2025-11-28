/**
 * Active Directory Authentication Provider
 *
 * React context provider for AD authentication state and operations.
 * Supports Azure AD, Azure AD B2C, AD FS, and on-premises configurations.
 *
 * @module auth/active-directory/ad-provider
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { useFeatureFlag } from '@/lib/flags';
import type {
  ADConfig,
  ADContextValue,
  ADAuthState,
  ADUser,
  ADGroup,
  ADTokens,
  ADAuthError,

  ADLogoutOptions,
  TokenAcquisitionRequest,
  TokenRefreshResult,
  ADUserAttributes,
  ADAuthEvent,
} from './types';
import type { Role, Permission } from '../types';
import { createADClient } from './ad-client';
import { createTokenHandler } from './ad-token-handler';
import { ADGroupMapper, createGroupMapper } from './ad-groups';
import { ADAttributeMapper, createAttributeMapper } from './ad-attributes';
import { createSSOManager } from './ad-sso';
import { validateADConfig } from './ad-config';

// =============================================================================
// Context
// =============================================================================

/**
 * AD Authentication Context.
 */
export const ADContext = createContext<ADContextValue | null>(null);

// =============================================================================
// Types
// =============================================================================

/**
 * AD Provider component props.
 */
export interface ADProviderProps {
  /** AD configuration */
  config: ADConfig;
  /** Child components */
  children: ReactNode;
  /** Group to role mapping configuration */
  groupMappings?: Parameters<typeof createGroupMapper>[0];
  /** Custom attribute mapper configuration */
  attributeMapperConfig?: Parameters<typeof createAttributeMapper>[0];
  /** Enable SSO support */
  enableSSO?: boolean;
  /** SSO configuration */
  ssoConfig?: Parameters<typeof createSSOManager>[0];
  /** Callback when authentication state changes */
  onAuthStateChange?: (state: ADAuthState) => void;
  /** Callback when authentication events occur */
  onAuthEvent?: (event: ADAuthEvent) => void;
  /** Loading component to show during initialization */
  loadingComponent?: ReactNode;
  /** Error component to show on configuration errors */
  errorComponent?: (error: string) => ReactNode;
}

/**
 * Action types for auth state reducer.
 */
type ADAuthAction =
  | { type: 'INITIALIZE_START' }
  | { type: 'INITIALIZE_SUCCESS'; payload: { user: ADUser; tokens: ADTokens } }
  | { type: 'INITIALIZE_FAILURE'; payload: ADAuthError }
  | { type: 'INITIALIZE_NO_SESSION' }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: ADUser; tokens: ADTokens } }
  | { type: 'LOGIN_FAILURE'; payload: ADAuthError }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESH_START' }
  | { type: 'TOKEN_REFRESH_SUCCESS'; payload: ADTokens }
  | { type: 'TOKEN_REFRESH_FAILURE'; payload: ADAuthError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<ADUser> }
  | { type: 'SET_SSO_SESSION'; payload: boolean };

// =============================================================================
// Reducer
// =============================================================================

const initialState: ADAuthState = {
  user: null,
  isAuthenticated: false,
  isAuthenticating: false,
  isRefreshing: false,
  tokens: null,
  error: null,
  provider: null,
  accountId: null,
  hasSsoSession: false,
  lastAuthTime: null,
  tokenExpiresAt: null,
};

function authReducer(state: ADAuthState, action: ADAuthAction): ADAuthState {
  switch (action.type) {
    case 'INITIALIZE_START':
      return {
        ...state,
        isAuthenticating: true,
        error: null,
      };

    case 'INITIALIZE_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isAuthenticating: false,
        error: null,
        provider: action.payload.user.adProvider,
        accountId: action.payload.tokens.accountId || null,
        lastAuthTime: Date.now(),
        tokenExpiresAt: action.payload.tokens.expiresAt,
      };

    case 'INITIALIZE_FAILURE':
      return {
        ...state,
        isAuthenticating: false,
        error: action.payload,
      };

    case 'INITIALIZE_NO_SESSION':
      return {
        ...state,
        isAuthenticating: false,
      };

    case 'LOGIN_START':
      return {
        ...state,
        isAuthenticating: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isAuthenticating: false,
        error: null,
        provider: action.payload.user.adProvider,
        accountId: action.payload.tokens.accountId || null,
        lastAuthTime: Date.now(),
        tokenExpiresAt: action.payload.tokens.expiresAt,
        hasSsoSession: true,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticating: false,
        error: action.payload,
      };

    case 'LOGOUT':
      return {
        ...initialState,
      };

    case 'TOKEN_REFRESH_START':
      return {
        ...state,
        isRefreshing: true,
      };

    case 'TOKEN_REFRESH_SUCCESS':
      return {
        ...state,
        tokens: action.payload,
        isRefreshing: false,
        tokenExpiresAt: action.payload.expiresAt,
      };

    case 'TOKEN_REFRESH_FAILURE':
      return {
        ...state,
        isRefreshing: false,
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    case 'SET_SSO_SESSION':
      return {
        ...state,
        hasSsoSession: action.payload,
      };

    default:
      return state;
  }
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Active Directory Authentication Provider.
 *
 * Provides AD authentication context to child components. Manages
 * authentication state, token refresh, group mapping, and SSO.
 *
 * @example
 * ```tsx
 * import { ADProvider } from '@/lib/auth/active-directory';
 * import { createADConfig } from '@/lib/auth/active-directory';
 *
 * const adConfig = createADConfig('azure-ad', {
 *   tenantId: process.env.AZURE_AD_TENANT_ID,
 *   clientId: process.env.AZURE_AD_CLIENT_ID,
 *   redirectUri: window.location.origin,
 * });
 *
 * function App() {
 *   return (
 *     <ADProvider
 *       config={adConfig}
 *       groupMappings="azureSecurityGroups"
 *       enableSSO
 *     >
 *       <MyApplication />
 *     </ADProvider>
 *   );
 * }
 * ```
 */
export function ADProvider({
  config,
  children,
  groupMappings,
  attributeMapperConfig,
  enableSSO = true,
  ssoConfig,
  onAuthStateChange,
  onAuthEvent,
  loadingComponent,
  errorComponent,
}: ADProviderProps) {
  // Check feature flag
  const isADEnabled = useFeatureFlag(config.featureFlag ?? 'ad-authentication');

  // State
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Validate configuration
  const configValidation = useMemo(() => validateADConfig(config), [config]);

  // Create services
  const adClient = useMemo(
    () =>
      createADClient(config, {
        onTokenRefresh: (tokens) => {
          dispatch({ type: 'TOKEN_REFRESH_SUCCESS', payload: tokens });
          emitEvent({ type: 'token_refreshed', correlationId: generateCorrelationId() });
        },
        onAuthError: (error) => {
          dispatch({ type: 'TOKEN_REFRESH_FAILURE', payload: error });
          emitEvent({ type: 'error', error, correlationId: generateCorrelationId() });
        },
      }),
    [config]
  );

  const tokenHandler = useMemo(
    () =>
      createTokenHandler(config, {
        cacheLocation: config.azure?.cacheLocation ?? 'sessionStorage',
        autoRefresh: config.silentRefresh,
        debug: config.debug,
        onTokenRefresh: (tokens) => {
          dispatch({ type: 'TOKEN_REFRESH_SUCCESS', payload: tokens });
          adClient.setTokens(tokens);
        },
        onRefreshFailed: (error) => {
          dispatch({ type: 'TOKEN_REFRESH_FAILURE', payload: error });
        },
      }),
    [config, adClient]
  );

  const groupMapper = useMemo(
    () => createGroupMapper(groupMappings ?? [], { appPrefix: 'app' }),
    [groupMappings]
  );

  const attributeMapper = useMemo(
    () => createAttributeMapper(attributeMapperConfig),
    [attributeMapperConfig]
  );

  const ssoManager = useMemo(
    () =>
      enableSSO
        ? createSSOManager({
            ...ssoConfig,
            debug: config.debug,
            onSessionChange: (session) => {
              dispatch({ type: 'SET_SSO_SESSION', payload: session !== null });
            },
            onSessionExpired: () => {
              dispatch({ type: 'LOGOUT' });
              emitEvent({
                type: 'session_expired',
                correlationId: generateCorrelationId(),
              });
            },
          })
        : null,
    [enableSSO, ssoConfig, config.debug]
  );

  // ===========================================================================
  // Event Emitter
  // ===========================================================================

  const emitEvent = useCallback(
    (event: ADAuthEvent) => {
      onAuthEvent?.(event);
      if (config.debug) {
        console.log('[ADProvider] Event:', event);
      }
    },
    [onAuthEvent, config.debug]
  );

  // ===========================================================================
  // Authentication Methods
  // ===========================================================================

  const initialize = useCallback(async () => {
    const correlationId = generateCorrelationId();
    dispatch({ type: 'INITIALIZE_START' });

    try {
      // Check for redirect response first
      const redirectTokens = await tokenHandler.handleRedirectResponse();
      if (redirectTokens) {
        adClient.initialize(redirectTokens);
        const user = await adClient.getCurrentUser();
        const mappedUser = applyMappings(user, groupMapper, attributeMapper);

        if (ssoManager) {
          await ssoManager.startSession(mappedUser, redirectTokens);
        }

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: mappedUser, tokens: redirectTokens },
        });
        emitEvent({
          type: 'login_success',
          user: mappedUser,
          correlationId,
        });
        return;
      }

      // Check for existing SSO session
      if (ssoManager) {
        const existingSession = await ssoManager.detectSession();
        if (existingSession) {
          const sessionTokens = ssoManager.getSessionTokens();
          if (sessionTokens) {
            adClient.initialize(sessionTokens);
            const user = await adClient.getCurrentUser();
            const mappedUser = applyMappings(user, groupMapper, attributeMapper);

            dispatch({
              type: 'INITIALIZE_SUCCESS',
              payload: { user: mappedUser, tokens: sessionTokens },
            });
            emitEvent({
              type: 'sso_detected',
              upn: mappedUser.adAttributes.upn,
              correlationId,
            });
            return;
          }
        }
      }

      // Try silent token acquisition
      const cachedTokens = await tokenHandler.acquireTokenSilent({
        scopes: getDefaultScopes(config),
      });

      if (cachedTokens) {
        adClient.initialize(cachedTokens);
        const user = await adClient.getCurrentUser();
        const mappedUser = applyMappings(user, groupMapper, attributeMapper);

        if (ssoManager) {
          await ssoManager.startSession(mappedUser, cachedTokens);
        }

        dispatch({
          type: 'INITIALIZE_SUCCESS',
          payload: { user: mappedUser, tokens: cachedTokens },
        });
        return;
      }

      // No existing session
      dispatch({ type: 'INITIALIZE_NO_SESSION' });
    } catch (error) {
      const authError = createAuthError(error);
      dispatch({ type: 'INITIALIZE_FAILURE', payload: authError });
      emitEvent({ type: 'error', error: authError, correlationId });
    }
  }, [config, tokenHandler, adClient, groupMapper, attributeMapper, ssoManager, emitEvent]);

  const login = useCallback(
    async (options?: TokenAcquisitionRequest) => {
      const correlationId = generateCorrelationId();
      dispatch({ type: 'LOGIN_START' });
      emitEvent({
        type: 'login_initiated',
        provider: config.providerType,
        correlationId,
      });

      try {
        const tokens = await tokenHandler.acquireTokenInteractive({
          scopes: options?.scopes ?? getDefaultScopes(config),
          prompt: options?.prompt,
          loginHint: options?.loginHint,
          domainHint: options?.domainHint,
        });

        adClient.initialize(tokens);
        const user = await adClient.getCurrentUser();
        const mappedUser = applyMappings(user, groupMapper, attributeMapper);

        if (ssoManager) {
          await ssoManager.startSession(mappedUser, tokens);
        }

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: mappedUser, tokens },
        });
        emitEvent({
          type: 'login_success',
          user: mappedUser,
          correlationId,
        });
      } catch (error) {
        const authError = createAuthError(error);
        dispatch({ type: 'LOGIN_FAILURE', payload: authError });
        emitEvent({
          type: 'login_failed',
          error: authError,
          correlationId,
        });
        throw authError;
      }
    },
    [config, tokenHandler, adClient, groupMapper, attributeMapper, ssoManager, emitEvent]
  );

  const loginSilent = useCallback(
    async (options?: TokenAcquisitionRequest) => {
      generateCorrelationId(); // Generate for logging/tracking
      dispatch({ type: 'LOGIN_START' });

      try {
        const tokens = await tokenHandler.acquireTokenSilent({
          scopes: options?.scopes ?? getDefaultScopes(config),
          account: options?.account,
        });

        if (!tokens) {
          throw { code: 'interaction_required', message: 'Silent login failed, interaction required' };
        }

        adClient.initialize(tokens);
        const user = await adClient.getCurrentUser();
        const mappedUser = applyMappings(user, groupMapper, attributeMapper);

        if (ssoManager) {
          await ssoManager.startSession(mappedUser, tokens);
        }

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: mappedUser, tokens },
        });
      } catch (error) {
        const authError = createAuthError(error);
        dispatch({ type: 'LOGIN_FAILURE', payload: authError });
        throw authError;
      }
    },
    [config, tokenHandler, adClient, groupMapper, attributeMapper, ssoManager]
  );

  const logout = useCallback(
    async (options?: ADLogoutOptions) => {
      const correlationId = generateCorrelationId();
      emitEvent({ type: 'logout_initiated', correlationId });

      try {
        // End SSO session
        if (ssoManager) {
          await ssoManager.endSession();
        }

        // Clear token cache
        tokenHandler.clearCache();

        // Update state
        dispatch({ type: 'LOGOUT' });

        // If not local only, redirect to AD logout
        if (!options?.localOnly) {
          const logoutUrl = buildLogoutUrl(config, options);
          if (logoutUrl) {
            window.location.href = logoutUrl;
            return;
          }
        }

        emitEvent({ type: 'logout_success', correlationId });
      } catch (error) {
        // Ensure we still clear local state on error
        dispatch({ type: 'LOGOUT' });
        emitEvent({ type: 'logout_success', correlationId });
      }
    },
    [config, ssoManager, tokenHandler, emitEvent]
  );

  const acquireToken = useCallback(
    async (request: TokenAcquisitionRequest): Promise<ADTokens> => {
      // Try silent first
      const silentTokens = await tokenHandler.acquireTokenSilent(request);
      if (silentTokens) {
        return silentTokens;
      }

      // Fall back to interactive
      return tokenHandler.acquireTokenInteractive({
        ...request,
        prompt: 'consent',
      });
    },
    [tokenHandler]
  );

  const acquireTokenSilent = useCallback(
    async (request: TokenAcquisitionRequest): Promise<ADTokens | null> => {
      return tokenHandler.acquireTokenSilent(request);
    },
    [tokenHandler]
  );

  const refreshTokens = useCallback(async (): Promise<TokenRefreshResult> => {
    dispatch({ type: 'TOKEN_REFRESH_START' });

    const cachedTokens = tokenHandler.getCachedTokens();
    const tokens = await cachedTokens;
    if (!tokens?.refreshToken) {
      const error: ADAuthError = {
        code: 'no_refresh_token',
        message: 'No refresh token available',
        timestamp: Date.now(),
        recoverable: false,
      };
      dispatch({ type: 'TOKEN_REFRESH_FAILURE', payload: error });
      return { success: false, error, requiresInteraction: true };
    }

    return tokenHandler.refreshToken(tokens.refreshToken);
  }, [tokenHandler]);

  const getUserGroups = useCallback(async (): Promise<ADGroup[]> => {
    if (!state.isAuthenticated) {
      return [];
    }
    return adClient.getUserGroups(true);
  }, [state.isAuthenticated, adClient]);

  const isInGroup = useCallback(
    (groupId: string): boolean => {
      if (!state.user) return false;
      return state.user.adGroups.some(
        (g) => g.id === groupId || g.displayName.toLowerCase() === groupId.toLowerCase()
      );
    },
    [state.user]
  );

  const hasAttribute = useCallback(
    (attribute: keyof ADUserAttributes, value: unknown): boolean => {
      if (!state.user) return false;
      return state.user.adAttributes[attribute] === value;
    },
    [state.user]
  );

  const getMappedRoles = useCallback((): Role[] => {
    if (!state.user) return [];
    return state.user.roles;
  }, [state.user]);

  const getEffectivePermissions = useCallback((): Permission[] => {
    if (!state.user) return [];
    return state.user.effectivePermissions;
  }, [state.user]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const forceReauth = useCallback(async () => {
    await logout({ localOnly: true });
    await login({ prompt: 'login', scopes: getDefaultScopes(config) });
  }, [logout, login, config]);

  // ===========================================================================
  // Effects
  // ===========================================================================

  // Auto-initialize on mount
  useEffect(() => {
    if (isADEnabled && configValidation.valid) {
      initialize();
    }
  }, [isADEnabled, configValidation.valid, initialize]);

  // Notify state changes
  useEffect(() => {
    onAuthStateChange?.(state);
  }, [state, onAuthStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tokenHandler.dispose();
      ssoManager?.dispose();
    };
  }, [tokenHandler, ssoManager]);

  // ===========================================================================
  // Context Value
  // ===========================================================================

  const contextValue: ADContextValue = useMemo(
    () => ({
      ...state,
      config,
      initialize,
      login,
      loginSilent,
      logout,
      acquireToken,
      acquireTokenSilent,
      refreshTokens,
      getUserGroups,
      isInGroup,
      hasAttribute,
      getMappedRoles,
      getEffectivePermissions,
      clearError,
      forceReauth,
    }),
    [
      state,
      config,
      initialize,
      login,
      loginSilent,
      logout,
      acquireToken,
      acquireTokenSilent,
      refreshTokens,
      getUserGroups,
      isInGroup,
      hasAttribute,
      getMappedRoles,
      getEffectivePermissions,
      clearError,
      forceReauth,
    ]
  );

  // ===========================================================================
  // Render
  // ===========================================================================

  // Show error if configuration is invalid
  if (!configValidation.valid) {
    const errorMessage = `AD Configuration Error: ${configValidation.errors.join(', ')}`;
    if (errorComponent) {
      return <>{errorComponent(errorMessage)}</>;
    }
    console.error(errorMessage);
    return <>{children}</>;
  }

  // Show loading during initialization
  if (state.isAuthenticating && !state.isAuthenticated && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  // Feature flag is disabled
  if (!isADEnabled) {
    return <>{children}</>;
  }

  return <ADContext.Provider value={contextValue}>{children}</ADContext.Provider>;
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateCorrelationId(): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createAuthError(error: unknown): ADAuthError {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const e = error as { code: string; message?: string; description?: string };
    return {
      code: e.code,
      message: e.message ?? 'Authentication error',
      description: e.description,
      timestamp: Date.now(),
      recoverable: !['config_error', 'state_mismatch'].includes(e.code),
      originalError: error,
    };
  }

  return {
    code: 'unknown_error',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    timestamp: Date.now(),
    recoverable: true,
    originalError: error,
  };
}

function getDefaultScopes(config: ADConfig): string[] {
  switch (config.providerType) {
    case 'azure-ad':
      return config.azure?.scopes ?? ['openid', 'profile', 'email', 'User.Read'];
    case 'azure-ad-b2c':
      return config.azureB2C?.scopes ?? ['openid', 'profile', 'offline_access'];
    case 'adfs':
      return config.adfs?.scopes ?? ['openid', 'profile', 'email'];
    default:
      return ['openid', 'profile'];
  }
}

function buildLogoutUrl(config: ADConfig, options?: ADLogoutOptions): string | null {
  let authority: string | undefined;
  let postLogoutUri: string | undefined;

  switch (config.providerType) {
    case 'azure-ad':
      authority = config.azure?.authority;
      postLogoutUri = options?.postLogoutRedirectUri ?? config.azure?.postLogoutRedirectUri;
      break;
    case 'azure-ad-b2c':
      authority = config.azureB2C?.authority;
      postLogoutUri = options?.postLogoutRedirectUri ?? config.azureB2C?.postLogoutRedirectUri;
      break;
    case 'adfs':
      authority = config.adfs?.serverUrl;
      break;
    default:
      return null;
  }

  if (!authority) return null;

  const params = new URLSearchParams();
  if (postLogoutUri) {
    params.set('post_logout_redirect_uri', postLogoutUri);
  }
  if (options?.logoutHint) {
    params.set('logout_hint', options.logoutHint);
  }

  const queryString = params.toString();
  return `${authority}/oauth2/v2.0/logout${queryString ? `?${queryString}` : ''}`;
}

function applyMappings(
  user: ADUser,
  groupMapper: ADGroupMapper,
  attributeMapper: ADAttributeMapper
): ADUser {
  // Apply group to role mapping
  const { role, permissions } = groupMapper.mapUserGroups(
    user.adGroups,
    user
  );

  // Apply attribute mapping
  const mappedUser = attributeMapper.mapToUser(user);

  return {
    ...user,
    ...mappedUser,
    roles: role ? [role] : [],
    permissions: permissions,
    effectivePermissions: permissions,
    adGroups: user.adGroups,
  };
}

// =============================================================================
// Export
// =============================================================================

export default ADProvider;
