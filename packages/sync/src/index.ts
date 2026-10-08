export type { IStorage, IEnumerableStorage, ITreeStorage } from './I-storage';

export type { ISyncAccount } from './account/I-sync-account';
export type { ISyncAccountFactory } from './account/I-sync-account-factory';
export { SyncAccountFactory, type SyncAccountFactoryOptions } from './account/sync-account-factory';

export type { OnboardedAccount, OnboardingConnector } from './onboarding/connector';

export type { ISyncProvider } from './sync-provider/I-sync-provider';
export { SyncStatus } from './sync-provider/sync-status';
export type { ISyncStatusManager } from './sync-provider/sync-status';
export type { Device } from './device-manager/device-repository';
export { ReconnectFromAnotherAccountError } from './device-manager/device-management-service';

export { SyncError, OnboardingAbortedError } from './sync-error';

export type { ISecretEncryptor, SSecretDecrypted, SSecretEncrypted } from './secret-encryptor';
export { sSecretEncrypted, sSecretDecrypted } from './secret-encryptor';

export { type IsomorphicEventSource } from './utils/sse-stream';
export { waitForChange } from './utils/wait-for-change';

export { type SafelyCrypto } from './safely-crypto';

export {
    LogLevel,
    Logger,
    ConsoleTransport,
    CombinedTransport,
    FileTransport,
    logsFilterMinSeverityLevel
} from './logger';
export type {
    LogEntry,
    ILoggerTransport,
    LogsFilter,
    ILogFileWriter,
    ILogFileStore,
    LogMeta,
    LogRecord
} from './logger';
export { MKDerivationDomain } from './crypto/service/master-key-service';
