import { lazy } from 'react';
import type { AgentDefinition } from './types';

/**
 * THE list of agents. The shell and home page read only this file.
 * Each team edits only its own entry (name/description) and its own folder.
 * To add or rename: see docs/adding-an-agent.md.
 */
export const AGENTS: AgentDefinition[] = [
  {
    id: 'agent1',
    name: 'Agent 1',
    description: 'Placeholder. Team 1 describes the agent here.',
    roles: ['trainee', 'admin'],
    component: lazy(() => import('./agent1')),
  },
  {
    id: 'agent2',
    name: 'Bias Flagging Agent',
    description:
      'Check feedback text against bias flags and review low-confidence findings. Admins manage the flags.',
    roles: ['trainee', 'admin'],
    component: lazy(() => import('./agent2')),
  },
  {
    id: 'agent3',
    name: 'Stakeholder Roleplay',
    description:
      'Practise handling a difficult client in a simulated chat, then get a report. Admins configure and review.',
    roles: ['trainee', 'admin'],
    component: lazy(() => import('./agent3')),
  },
  {
    id: 'agent4',
    name: 'Adaptive Skill-Gap Diagnostic Agent',
    headerTitle: 'ASGD agent',
    description:
      'Asks about a trainee and answers from the trainee database: skill gaps, recommended exercises and the full report. Every report waits for a human review.',
    roles: ['trainee', 'admin'],
    component: lazy(() => import('./agent4')),
  },
];

export function agentsForRole(role: string): AgentDefinition[] {
  return AGENTS.filter((a) => (a.roles as string[]).includes(role));
}
