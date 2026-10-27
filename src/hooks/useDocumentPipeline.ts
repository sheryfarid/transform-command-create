import { useEffect } from 'react';
import { useProgrammeStore } from '../stores/programmeStore';

/** Drives the simulated ingestion worker. Mount once at the app root. */
export function useDocumentPipeline(intervalMs = 550) {
  const processing = useProgrammeStore((s) => s.docs.some((d) => d.status === 'processing'));
  const docs = useProgrammeStore((s) => s.docs);
  const advance = useProgrammeStore((s) => s.advancePipeline);
  useEffect(() => {
    if (!processing) return;
    const t = setTimeout(advance, intervalMs);
    return () => clearTimeout(t);
  }, [processing, docs, advance, intervalMs]);
}
