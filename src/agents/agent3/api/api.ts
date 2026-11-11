import type {
  ConfigKeySummary,
  ConfigKind,
  DemandDetail,
  DemandOut,
  Health,
  PersonaConfig,
  PersonaSummary,
  ProfileDetail,
  ProfileOut,
  ReportFormat,
  ReportStatus,
  ScenarioConfig,
  ScenarioImportResult,
  SessionDetail,
  SessionOut,
  SessionStatus,
  TurnResult,
  VersionOut,
} from './types';

/** Error from the API. `status` 0 means the API could not be reached. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
  /** Network failure or server error: the user may try the same request again. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export type UploadResult<T> = { item: T; reused: boolean };

/**
 * Everything agent 3 needs from the backend. Two implementations:
 * `httpApi.ts` (real FastAPI) and `mockApi.ts` (in-memory, VITE_USE_MOCKS=true).
 * Pages and hooks depend on this interface only.
 */
export interface Agent3Api {
  health(): Promise<Health>;

  // Published personas (both roles)
  listPersonas(): Promise<PersonaSummary[]>;

  // Admin: versioned config (persona + scenario)
  listConfig(kind: ConfigKind): Promise<ConfigKeySummary[]>;
  getVersion<K extends ConfigKind>(
    kind: K,
    key: string,
    versionNo: number,
  ): Promise<VersionOut<K extends 'persona' ? PersonaConfig : ScenarioConfig>>;
  createPersona(key: string, config: PersonaConfig): Promise<VersionOut<PersonaConfig>>;
  newPersonaVersion(key: string): Promise<VersionOut<PersonaConfig>>;
  saveDraft(
    key: string,
    versionNo: number,
    config: PersonaConfig,
  ): Promise<VersionOut<PersonaConfig>>;
  publish(key: string, versionNo: number): Promise<VersionOut<PersonaConfig>>;
  importScenarios(scenarios: ScenarioConfig[]): Promise<ScenarioImportResult>;

  // Resumes
  uploadProfile(file: File): Promise<UploadResult<ProfileDetail>>;
  listProfiles(): Promise<ProfileOut[]>;
  getProfile(id: string): Promise<ProfileDetail>;
  deleteProfile(id: string): Promise<void>;

  // Demand documents (admin)
  uploadDemand(file: File): Promise<UploadResult<DemandDetail>>;
  listDemand(): Promise<DemandOut[]>;
  getDemand(id: string): Promise<DemandDetail>;
  deleteDemand(id: string): Promise<void>;

  // Chat sessions
  startSession(personaKey: string, profileId: string): Promise<SessionDetail>;
  listSessions(filter?: { status?: SessionStatus; traineeRef?: string }): Promise<SessionOut[]>;
  getSession(id: string): Promise<SessionDetail>;
  /** `ticket` is sent as the Idempotency-Key. Re-use it when retrying the same message. */
  sendTurn(sessionId: string, content: string, ticket: string): Promise<TurnResult>;
  endSession(id: string): Promise<SessionDetail>;

  // Reports
  getReport(sessionId: string): Promise<ReportStatus>;
  requestReport(sessionId: string): Promise<ReportStatus>;
  downloadReport(sessionId: string, format: ReportFormat): Promise<Blob>;
}
