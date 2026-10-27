import { useState, type ChangeEvent } from 'react';
import type { CandidateSpec, DocumentSpec, EvidenceDocument, FieldKey } from '../../types/domain';
import { FIELD_LABEL, SAMPLE_DOCS, STAGES } from '../../features/reference';
import { parseCSV } from '../../features/utils';
import { useProgrammeStore } from '../../stores/programmeStore';
import { Button, Chip, Empty, FactInline, Gate, Section, useCan } from '../ui';

const INJECTION = /[^\n]*(ignore (all |any )?(previous|prior) instructions|disregard [^\n]*instructions|you are now|system prompt)[^\n]*/i;
const FIELD_MAP: Record<string, FieldKey> = { owner: 'owner', release: 'release', client: 'client', company_codes: 'companyCodes', companycodes: 'companyCodes', deployment: 'deployment', sid: 'sid' };

/**
 * Builds a document spec from a real file. Documents are untrusted: instruction-like text is
 * flagged, never executed. Production extraction runs in backend workers, not the browser.
 */
function readUpload(file: File, text: string | null): DocumentSpec {
  const ext = file.name.split('.').pop()!.toLowerCase();
  const base = { name: file.name, type: ext.toUpperCase(), size: `${Math.ceil(file.size / 1024)} KB` };
  if (text == null) {
    return { ...base, classification: 'Unclassified', injection: null, candidates: [], rejected: 'This prototype reads CSV, TXT and MD files in the browser. DOCX, XLSX and PDF extraction run in backend worker jobs in production.' };
  }
  const inj = text.match(INJECTION);
  const candidates: CandidateSpec[] = ext === 'csv'
    ? parseCSV(text)
      .filter((r) => r.system_id && FIELD_MAP[(r.field || '').toLowerCase()] && r.value)
      .map((r, i) => ({ systemId: r.system_id, field: FIELD_MAP[r.field.toLowerCase()], value: r.value, confidence: 0.95, location: `Row ${i + 2}` }))
    : [];
  return { ...base, classification: candidates.length ? 'Structured fact list' : 'Unstructured text', injection: inj ? inj[0].trim().slice(0, 160) : null, candidates };
}

export function EvidencePage() {
  const systems = useProgrammeStore((s) => s.systems);
  const docs = useProgrammeStore((s) => s.docs);
  const uploadDocument = useProgrammeStore((s) => s.uploadDocument);
  const [selected, setSelected] = useState<string | null>(null);

  const upload = (spec: DocumentSpec) => setSelected(uploadDocument(spec));
  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    const ext = f.name.split('.').pop()!.toLowerCase();
    if (!['csv', 'txt', 'md'].includes(ext)) return upload(readUpload(f, null));
    const reader = new FileReader();
    reader.onload = () => upload(readUpload(f, String(reader.result)));
    reader.readAsText(f);
  };

  if (!systems.length) {
    return <Empty title="Import the inventory first"><p>Extracted facts are matched against ERP records, so evidence needs an inventory to attach to.</p></Empty>;
  }
  const doc = docs.find((d) => d.id === selected) ?? docs[0];

  return (
    <div className="stack">
      <Section title="Upload evidence" aside={<span className="fine">Documents are untrusted input. Embedded instructions are flagged and never followed.</span>}>
        <div className="sample-docs">
          {SAMPLE_DOCS.map((d) => {
            const used = docs.some((x) => x.name === d.name);
            return (
              <button type="button" key={d.key} className="sample-doc" disabled={used} onClick={() => upload(d)}>
                <span className="doc-type">{d.type}</span>
                <span><b>{d.name}</b><span className="fine">{d.classification}, {d.size}</span></span>
                <span className="fine">{used ? 'Uploaded' : 'Upload'}</span>
              </button>
            );
          })}
          <label className="sample-doc file-btn">
            <span className="doc-type">CSV</span>
            <span><b>Upload your own file</b><span className="fine">CSV with columns system_id, field, value; or TXT</span></span>
            <span className="fine">Choose</span>
            <input type="file" accept=".csv,.txt,.md,.pdf,.docx,.xlsx" onChange={onFile} />
          </label>
        </div>
      </Section>

      {docs.length > 0 && (
        <div className="grid-doc">
          <Section title="Documents">
            {docs.map((d) => <DocumentRow key={d.id} doc={d} active={doc?.id === d.id} onSelect={() => setSelected(d.id)} />)}
          </Section>
          {doc && <DocumentReview doc={doc} />}
        </div>
      )}
    </div>
  );
}

function DocumentRow({ doc, active, onSelect }: { doc: EvidenceDocument; active: boolean; onSelect: () => void }) {
  const pending = doc.candidates.filter((c) => c.state === 'pending' && !c.unmatched).length;
  return (
    <button type="button" className={`doc-row ${active ? 'on' : ''}`} onClick={onSelect}>
      <span className="doc-type">{doc.type}</span>
      <span className="doc-meta">
        <b>{doc.name}</b>
        <span className="pipeline">
          {STAGES.map((s, i) => {
            const cls = doc.status === 'rejected' ? (i === 0 ? 'fail' : '') : doc.stage > i || doc.status === 'review' ? 'done' : doc.stage === i ? 'now' : '';
            return <i key={s} title={s} className={cls} />;
          })}
        </span>
        <span className="fine">
          {doc.status === 'processing' ? `${STAGES[Math.min(doc.stage, STAGES.length - 1)]}…` : doc.status === 'rejected' ? 'Rejected at validation' : `${pending} facts awaiting review`}
        </span>
      </span>
    </button>
  );
}

function DocumentReview({ doc }: { doc: EvidenceDocument }) {
  const systems = useProgrammeStore((s) => s.systems);
  const reviewEvidence = useProgrammeStore((s) => s.reviewEvidence);
  const gate = useCan('reviewEvidence');
  const statusChip = doc.status === 'review' ? <Chip tone="violet">Human review</Chip> : doc.status === 'rejected' ? <Chip tone="bad">Rejected</Chip> : <Chip tone="info">Processing</Chip>;

  return (
    <Section title={doc.name} aside={statusChip}>
      {doc.status === 'rejected' && <p className="callout bad">{doc.rejectReason}</p>}
      {doc.status === 'processing' && (
        <ol className="stage-list">{STAGES.map((s, i) => <li key={s} className={doc.stage > i ? 'done' : doc.stage === i ? 'now' : ''}>{s}</li>)}</ol>
      )}
      {doc.status === 'review' && (
        <>
          {doc.injection && (
            <div className="callout bad">
              <b>Embedded instruction detected and ignored.</b>
              <p className="quote">“{doc.injection}”</p>
              <p className="fine">The text was treated as document content. No records changed. A security risk was logged for review.</p>
            </div>
          )}
          <p className="fine">Classified as {doc.classification}. Each fact links to its source location. Accepting a fact marks the field as verified; revoking returns it to review with its history intact.</p>
          <Gate perm="reviewEvidence" />
          {doc.candidates.length === 0 && <p className="fine">No structured facts were found. For CSV evidence use the columns system_id, field and value.</p>}
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>System and field</th><th>Current record</th><th>Extracted</th><th>Source</th><th>Confidence</th><th /></tr></thead>
              <tbody>
                {doc.candidates.map((c) => {
                  const s = systems.find((x) => x.id === c.systemId);
                  return (
                    <tr key={c.id}>
                      <td><b>{c.systemId}</b><div className="fine">{FIELD_LABEL[c.field]}</div></td>
                      <td>{s ? <FactInline f={s.facts[c.field]} /> : <span className="fine">No matching system</span>}</td>
                      <td>{c.value} {c.conflict && <Chip tone="bad">Conflict</Chip>}</td>
                      <td className="fine">{c.location}</td>
                      <td><Chip tone={c.confidence >= 0.9 ? 'ok' : c.confidence >= 0.8 ? 'info' : 'warn'}>{Math.round(c.confidence * 100)}%</Chip></td>
                      <td className="actions">
                        {c.unmatched ? <span className="fine">Unmatched</span>
                          : c.state === 'pending' ? <>
                            <Button small kind="primary" disabled={!gate.allowed} title={gate.title} onClick={() => reviewEvidence(doc.id, c.id, 'accept')}>Accept</Button>
                            <Button small disabled={!gate.allowed} title={gate.title} onClick={() => reviewEvidence(doc.id, c.id, 'reject')}>Reject</Button>
                          </>
                          : c.state === 'accepted' ? <Button small disabled={!gate.allowed} title={gate.title} onClick={() => reviewEvidence(doc.id, c.id, 'revoke')}>Revoke</Button>
                          : <Chip>{c.state}</Chip>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}
