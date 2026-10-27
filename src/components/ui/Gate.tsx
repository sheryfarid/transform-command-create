import { can, needs, type Permission } from '../../features/permissions';
import { useProgrammeStore } from '../../stores/programmeStore';

/** Explains why an action is disabled for the current role. Renders nothing when permitted. */
export function Gate({ perm }: { perm: Permission }) {
  const role = useProgrammeStore((s) => s.role);
  if (can(role, perm)) return null;
  return <p className="gate">{needs(perm)}. You are acting as {role}. Switch role in the header to continue.</p>;
}

export function useCan(perm: Permission) {
  const role = useProgrammeStore((s) => s.role);
  return { allowed: can(role, perm), title: needs(perm) };
}
