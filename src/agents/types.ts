import type { ComponentType, LazyExoticComponent } from 'react';
import type { Role } from '@/auth';

/** One entry per agent in registry.ts. This is the only contract between the shell and an agent. */
export type AgentDefinition = {
  /** URL segment, also the folder name. The agent is mounted at /agents/<id>/* */
  id: string;
  name: string;
  /** Shorter name shown in the top bar while the agent is open. Falls back to "Agent Portal". */
  headerTitle?: string;
  description: string;
  /** Roles that see the card and may open the agent. Role-specific pages are the agent's own business. */
  roles: Role[];
  /** Default export of the agent's index.tsx. Loaded lazily so teams' bundles stay separate. */
  component: LazyExoticComponent<ComponentType>;
};
