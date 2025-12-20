/**
 * SECURITY CONFIGURATION
 * 
 * Centralized security configuration for FedRAMP, CMMC, StateRAMP,
 * and Zero Trust compliance requirements.
 * 
 * Classification: CUI // SP-FEDCON
 */

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

export type Environment = 'development' | 'staging' | 'production' | 'fedramp';

export const getEnvironment = (): Environment => {
  const env = process.env.NODE_ENV || 'development';
  const fedrampMode = process.env.FEDRAMP_MODE === 'true';
  
  if (fedrampMode) return 'fedramp';
  if (env === 'production') return 'production';
  if (env === 'test' || env === 'staging') return 'staging';
  return 'development';
};

// ============================================================================
// COMPLIANCE LEVELS
// ============================================================================

export interface ComplianceConfig {
  fedrampLevel: 'low' | 'moderate' | 'high';
  cmmcLevel: 1 | 2 | 3;
  requireFIPS: boolean;
  requireMFA: boolean;
  cuiEnabled: boolean;
  auditLevel: 'minimal' | 'standard' | 'comprehensive' | 'forensic';
}

export const COMPLIANCE_PROFILES: Record<Environment, ComplianceConfig> = {
  development: {
    fedrampLevel: 'low',
    cmmcLevel: 1,
    requireFIPS: false,
    requireMFA: false,
    cuiEnabled: false,
    auditLevel: 'minimal',
  },
  staging: {
    fedrampLevel: 'moderate',
    cmmcLevel: 2,
    requireFIPS: true,
    requireMFA: true,
    cuiEnabled: true,
    auditLevel: 'standard',
  },
  production: {
    fedrampLevel: 'moderate',
    cmmcLevel: 2,
    requireFIPS: true,
    requireMFA: true,
    cuiEnabled: true,
    auditLevel: 'comprehensive',
  },
  fedramp: {
    fedrampLevel: 'moderate',
    cmmcLevel: 2,
    requireFIPS: true,
    requireMFA: true,
    cuiEnabled: true,
    auditLevel: 'forensic',
  },
};

export const getComplianceConfig = (): ComplianceConfig => {
  return COMPLIANCE_PROFILES[getEnvironment()];
};

// ============================================================================
// ENCRYPTION CONFIGURATION (SC-8, SC-13, SC-28)
// ============================================================================

export interface EncryptionConfig {
  // TLS Configuration
  tlsMinVersion: '1.2' | '1.3';
  tlsCipherSuites: string[];
  
  // Data at Rest
  atRestAlgorithm: 'AES-256-GCM' | 'AES-256-CBC';
  keyDerivation: 'PBKDF2' | 'scrypt' | 'argon2';
  keyLength: 256 | 384 | 512;
  
  // FIPS 140-2/3 Compliance
  fipsMode: boolean;
  fipsModuleValidated: boolean;
}

export const ENCRYPTION_CONFIG: Record<Environment, EncryptionConfig> = {
  development: {
    tlsMinVersion: '1.2',
    tlsCipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
    ],
    atRestAlgorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    keyLength: 256,
    fipsMode: false,
    fipsModuleValidated: false,
  },
  staging: {
    tlsMinVersion: '1.2',
    tlsCipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_AES_128_GCM_SHA256',
    ],
    atRestAlgorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    keyLength: 256,
    fipsMode: true,
    fipsModuleValidated: false,
  },
  production: {
    tlsMinVersion: '1.2',
    tlsCipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_AES_128_GCM_SHA256',
    ],
    atRestAlgorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    keyLength: 256,
    fipsMode: true,
    fipsModuleValidated: true,
  },
  fedramp: {
    tlsMinVersion: '1.3',
    tlsCipherSuites: [
      'TLS_AES_256_GCM_SHA384',
    ],
    atRestAlgorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    keyLength: 256,
    fipsMode: true,
    fipsModuleValidated: true,
  },
};

export const getEncryptionConfig = (): EncryptionConfig => {
  return ENCRYPTION_CONFIG[getEnvironment()];
};

// ============================================================================
// SESSION CONFIGURATION (AC-11, AC-12)
// ============================================================================

export interface SessionConfig {
  // Session lifetime
  maxDurationMinutes: number;
  idleTimeoutMinutes: number;
  absoluteTimeoutHours: number;
  
  // Reauthentication
  reauthForSensitiveOps: boolean;
  reauthIntervalMinutes: number;
  
  // Concurrent sessions
  maxConcurrentSessions: number;
  terminateOldestOnNew: boolean;
  
  // Session binding
  bindToIP: boolean;
  bindToDevice: boolean;
  
  // Secure flags
  secureCookie: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

export const SESSION_CONFIG: Record<Environment, SessionConfig> = {
  development: {
    maxDurationMinutes: 480,
    idleTimeoutMinutes: 60,
    absoluteTimeoutHours: 24,
    reauthForSensitiveOps: false,
    reauthIntervalMinutes: 120,
    maxConcurrentSessions: 10,
    terminateOldestOnNew: false,
    bindToIP: false,
    bindToDevice: false,
    secureCookie: false,
    httpOnly: true,
    sameSite: 'lax',
  },
  staging: {
    maxDurationMinutes: 240,
    idleTimeoutMinutes: 30,
    absoluteTimeoutHours: 12,
    reauthForSensitiveOps: true,
    reauthIntervalMinutes: 60,
    maxConcurrentSessions: 5,
    terminateOldestOnNew: true,
    bindToIP: false,
    bindToDevice: true,
    secureCookie: true,
    httpOnly: true,
    sameSite: 'strict',
  },
  production: {
    maxDurationMinutes: 120,
    idleTimeoutMinutes: 15,
    absoluteTimeoutHours: 8,
    reauthForSensitiveOps: true,
    reauthIntervalMinutes: 30,
    maxConcurrentSessions: 3,
    terminateOldestOnNew: true,
    bindToIP: false,
    bindToDevice: true,
    secureCookie: true,
    httpOnly: true,
    sameSite: 'strict',
  },
  fedramp: {
    maxDurationMinutes: 60,
    idleTimeoutMinutes: 10,
    absoluteTimeoutHours: 4,
    reauthForSensitiveOps: true,
    reauthIntervalMinutes: 15,
    maxConcurrentSessions: 2,
    terminateOldestOnNew: true,
    bindToIP: true,
    bindToDevice: true,
    secureCookie: true,
    httpOnly: true,
    sameSite: 'strict',
  },
};

export const getSessionConfig = (): SessionConfig => {
  return SESSION_CONFIG[getEnvironment()];
};

// ============================================================================
// AUTHENTICATION CONFIGURATION (IA-2, IA-5)
// ============================================================================

export interface AuthenticationConfig {
  // Password policy
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordHistory: number;
  maxPasswordAgeDays: number;
  
  // Lockout policy (AC-7)
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  lockoutResetMinutes: number;
  
  // MFA configuration
  mfaRequired: boolean;
  mfaMethods: ('totp' | 'webauthn' | 'sms' | 'email')[];
  mfaGracePeriodDays: number;
  
  // Token configuration
  accessTokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
  tokenRotation: boolean;
}

export const AUTH_CONFIG: Record<Environment, AuthenticationConfig> = {
  development: {
    minPasswordLength: 8,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
    passwordHistory: 0,
    maxPasswordAgeDays: 0,
    maxFailedAttempts: 10,
    lockoutDurationMinutes: 5,
    lockoutResetMinutes: 5,
    mfaRequired: false,
    mfaMethods: ['totp', 'email'],
    mfaGracePeriodDays: 0,
    accessTokenExpiryMinutes: 60,
    refreshTokenExpiryDays: 30,
    tokenRotation: false,
  },
  staging: {
    minPasswordLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordHistory: 12,
    maxPasswordAgeDays: 90,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    lockoutResetMinutes: 30,
    mfaRequired: true,
    mfaMethods: ['totp', 'webauthn'],
    mfaGracePeriodDays: 7,
    accessTokenExpiryMinutes: 30,
    refreshTokenExpiryDays: 7,
    tokenRotation: true,
  },
  production: {
    minPasswordLength: 14,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordHistory: 24,
    maxPasswordAgeDays: 60,
    maxFailedAttempts: 3,
    lockoutDurationMinutes: 30,
    lockoutResetMinutes: 60,
    mfaRequired: true,
    mfaMethods: ['totp', 'webauthn'],
    mfaGracePeriodDays: 0,
    accessTokenExpiryMinutes: 15,
    refreshTokenExpiryDays: 1,
    tokenRotation: true,
  },
  fedramp: {
    minPasswordLength: 15,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordHistory: 24,
    maxPasswordAgeDays: 60,
    maxFailedAttempts: 3,
    lockoutDurationMinutes: 60,
    lockoutResetMinutes: 120,
    mfaRequired: true,
    mfaMethods: ['webauthn', 'totp'], // Phishing-resistant preferred
    mfaGracePeriodDays: 0,
    accessTokenExpiryMinutes: 10,
    refreshTokenExpiryDays: 1,
    tokenRotation: true,
  },
};

export const getAuthConfig = (): AuthenticationConfig => {
  return AUTH_CONFIG[getEnvironment()];
};

// ============================================================================
// AUDIT CONFIGURATION (AU-2, AU-3, AU-12)
// ============================================================================

export interface AuditConfig {
  // Event categories to log
  auditCategories: AuditCategory[];
  
  // Retention
  retentionDays: number;
  archiveAfterDays: number;
  
  // Real-time alerting
  realTimeAlerts: boolean;
  alertThresholds: {
    failedLogins: number;
    privilegedActions: number;
    dataExports: number;
  };
  
  // Integrity protection
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
  chainEvents: boolean;
  signLogs: boolean;
  
  // Storage
  redundantStorage: boolean;
  offlineBackup: boolean;
}

export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'data_deletion'
  | 'data_export'
  | 'configuration_change'
  | 'privilege_escalation'
  | 'system_events'
  | 'security_events'
  | 'administrative_actions';

export const AUDIT_CONFIG: Record<Environment, AuditConfig> = {
  development: {
    auditCategories: ['authentication', 'authorization'],
    retentionDays: 30,
    archiveAfterDays: 0,
    realTimeAlerts: false,
    alertThresholds: { failedLogins: 10, privilegedActions: 50, dataExports: 100 },
    hashAlgorithm: 'SHA-256',
    chainEvents: false,
    signLogs: false,
    redundantStorage: false,
    offlineBackup: false,
  },
  staging: {
    auditCategories: [
      'authentication', 'authorization', 'data_access', 
      'data_modification', 'configuration_change', 'security_events',
    ],
    retentionDays: 90,
    archiveAfterDays: 30,
    realTimeAlerts: true,
    alertThresholds: { failedLogins: 5, privilegedActions: 20, dataExports: 50 },
    hashAlgorithm: 'SHA-256',
    chainEvents: true,
    signLogs: false,
    redundantStorage: true,
    offlineBackup: false,
  },
  production: {
    auditCategories: [
      'authentication', 'authorization', 'data_access', 
      'data_modification', 'data_deletion', 'data_export',
      'configuration_change', 'privilege_escalation',
      'system_events', 'security_events', 'administrative_actions',
    ],
    retentionDays: 365,
    archiveAfterDays: 90,
    realTimeAlerts: true,
    alertThresholds: { failedLogins: 3, privilegedActions: 10, dataExports: 20 },
    hashAlgorithm: 'SHA-256',
    chainEvents: true,
    signLogs: true,
    redundantStorage: true,
    offlineBackup: true,
  },
  fedramp: {
    auditCategories: [
      'authentication', 'authorization', 'data_access', 
      'data_modification', 'data_deletion', 'data_export',
      'configuration_change', 'privilege_escalation',
      'system_events', 'security_events', 'administrative_actions',
    ],
    retentionDays: 2190, // 6 years per FedRAMP
    archiveAfterDays: 365,
    realTimeAlerts: true,
    alertThresholds: { failedLogins: 3, privilegedActions: 5, dataExports: 10 },
    hashAlgorithm: 'SHA-384',
    chainEvents: true,
    signLogs: true,
    redundantStorage: true,
    offlineBackup: true,
  },
};

export const getAuditConfig = (): AuditConfig => {
  return AUDIT_CONFIG[getEnvironment()];
};

// ============================================================================
// NETWORK SECURITY CONFIGURATION (SC-7)
// ============================================================================

export interface NetworkSecurityConfig {
  // IP restrictions
  allowedIPRanges: string[];
  blockedCountries: string[];
  allowedCountries: string[];
  geoRestrictionEnabled: boolean;
  
  // Rate limiting
  rateLimitEnabled: boolean;
  requestsPerMinute: number;
  burstLimit: number;
  
  // WAF rules
  wafEnabled: boolean;
  blockSQLInjection: boolean;
  blockXSS: boolean;
  blockPathTraversal: boolean;
  
  // Headers
  hstsEnabled: boolean;
  hstsMaxAge: number;
  contentSecurityPolicy: string;
}

export const NETWORK_SECURITY_CONFIG: NetworkSecurityConfig = {
  allowedIPRanges: [], // Empty = all allowed (use with geo restrictions)
  blockedCountries: ['KP', 'IR', 'CU', 'SY', 'RU', 'CN'], // OFAC/ITAR
  allowedCountries: ['US', 'CA', 'GB', 'AU', 'NZ', 'DE', 'FR', 'JP'],
  geoRestrictionEnabled: getEnvironment() === 'fedramp',
  rateLimitEnabled: true,
  requestsPerMinute: getEnvironment() === 'fedramp' ? 60 : 120,
  burstLimit: getEnvironment() === 'fedramp' ? 10 : 20,
  wafEnabled: true,
  blockSQLInjection: true,
  blockXSS: true,
  blockPathTraversal: true,
  hstsEnabled: true,
  hstsMaxAge: 31536000,
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
};

// ============================================================================
// CUI HANDLING CONFIGURATION
// ============================================================================

export interface CUIConfig {
  enabled: boolean;
  categories: string[];
  markingRequired: boolean;
  encryptionRequired: boolean;
  mfaRequired: boolean;
  auditRequired: boolean;
  exportApprovalRequired: boolean;
  retentionYears: number;
}

export const CUI_CONFIG: CUIConfig = {
  enabled: getEnvironment() !== 'development',
  categories: [
    'CUI//SP-FEDCON',
    'CUI//SP-PRVCY',
    'CUI//SP-PROC',
    'CUI//SP-PROPIN',
    'CUI//SP-TAX',
  ],
  markingRequired: true,
  encryptionRequired: true,
  mfaRequired: true,
  auditRequired: true,
  exportApprovalRequired: true,
  retentionYears: 6,
};

// ============================================================================
// EXPORTS
// ============================================================================

export const SecurityConfig = {
  environment: getEnvironment(),
  compliance: getComplianceConfig(),
  encryption: getEncryptionConfig(),
  session: getSessionConfig(),
  authentication: getAuthConfig(),
  audit: getAuditConfig(),
  network: NETWORK_SECURITY_CONFIG,
  cui: CUI_CONFIG,
};

export default SecurityConfig;
