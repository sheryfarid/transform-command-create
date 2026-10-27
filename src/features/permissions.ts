import type { Role } from '../types/domain';

/** Role-based permissions. In production these map to Microsoft Entra ID groups and are enforced by the API. */
export const PERMS = {
  reviewEvidence: ['Data Steward', 'SAP Architect', 'Programme Lead'],
  reviewRec: ['Programme Lead', 'Executive Sponsor'],
  approveDecision: ['Executive Sponsor'],
  approveBaseline: ['Programme Lead'],
  resolveValidation: ['SAP Architect', 'Programme Lead'],
} satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMS;
export const can = (role: Role, p: Permission) => (PERMS[p] as Role[]).includes(role);
export const needs = (p: Permission) => `Requires ${PERMS[p].join(' or ')}`;
