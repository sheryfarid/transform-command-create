import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgrammeStore } from '../../stores/programmeStore';
import { Button, Section } from '../ui';

export function SetupPage() {
  const createProgramme = useProgrammeStore((s) => s.createProgramme);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: 'Northwind Global ERP Transformation',
    sponsor: 'Chief Financial Officer',
    objectives: 'Consolidate 24 SAP ERP environments onto a harmonised target platform by 2029 and establish accountable master data ownership.',
    scope: '24 countries, finance, supplier, customer and material domains',
  });
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = () => {
    createProgramme(form);
    navigate('/landscapes');
  };

  return (
    <div className="shell-setup">
      <div className="setup">
        <div className="setup-intro">
          <h1 className="display">Start with what you can prove.</h1>
          <p>Create a programme to begin the vertical slice: import the ERP inventory, upload evidence, review AI findings and watch the executive view update from real records.</p>
          <p className="fine">This is a fictional demonstration programme. Everything runs in your browser and persists only on this device.</p>
        </div>
        <Section title="Create programme" className="setup-form">
          <label>Programme name<input value={form.name} onChange={set('name')} /></label>
          <label>Business sponsor<input value={form.sponsor} onChange={set('sponsor')} /></label>
          <label>Objectives<textarea rows={3} value={form.objectives} onChange={set('objectives')} /></label>
          <label>Scope<input value={form.scope} onChange={set('scope')} /></label>
          <Button kind="primary" disabled={!form.name.trim()} onClick={submit}>Create programme</Button>
        </Section>
      </div>
    </div>
  );
}
