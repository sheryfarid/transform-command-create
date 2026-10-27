import type { ProgrammeState } from '../types/domain';
import { COUNTRIES, REGIONS } from './reference';
import { isMissing } from './utils';

export interface ProposedRequest { systemId: string | null; text: string }

/** Guided-interview topics. Each turns current gaps into targeted evidence requests. */
export const TOPICS: Record<string, (st: ProgrammeState) => ProposedRequest[]> = {
  'Master data and cross-country harmonisation': (st) => st.systems.filter((s) => isMissing(s.facts.owner.value)).slice(0, 4)
    .map((s) => ({ systemId: s.id, text: `Who is accountable for supplier and customer master data in ${s.id} (${COUNTRIES[s.country]}), and is it shared with any other system?` })),
  'SAP versions and technical compatibility': (st) => st.systems.filter((s) => s.facts.release.status !== 'verified' && s.product === 'SAP ECC').slice(0, 4)
    .map((s) => ({ systemId: s.id, text: `Provide a Basis export or SAP Readiness Check result confirming the release and enhancement package of ${s.id}.` })),
  'Regulatory and data residency constraints': (st) => st.systems.filter((s) => ['CN', 'IN', 'TR', 'AE'].includes(s.country))
    .map((s) => ({ systemId: s.id, text: `Do local regulations require financial or personal data from ${COUNTRIES[s.country]} (${s.id}) to remain in-country? Attach the legal opinion if available.` })),
  'Business process standardisation': (st) => REGIONS.filter((r) => st.systems.some((s) => s.region === r))
    .map((r) => ({ systemId: null, text: `Which order-to-cash and procure-to-pay steps in ${r} are mandated by local law rather than local preference?` })),
};
