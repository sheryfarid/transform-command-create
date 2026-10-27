import { useProgrammeStore } from '../stores/programmeStore';
import type { ProgrammeState } from '../types/domain';

/**
 * Whole-state snapshot for derived calculations (metrics, assessment state).
 * Fine at prototype scale; with a real API these become server-computed query results.
 */
export const useProgrammeState = (): ProgrammeState => useProgrammeStore((s) => s);
