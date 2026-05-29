import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card } from '../ui';
import { rotationState, daysSince } from '../lib/governance';
import { toast } from '../../ui/toast';
import type { VaultSecret } from '../types.advanced';

const STATE_TONE = { ok: 'emerald', 'due-soon': 'amber', overdue: 'rose' } as const;

/** Feature #31 — secrets vault with rotation health. */
export function SecretsPanel(): React.ReactElement {
  const secrets = useAdvancedStore((s) => s.secrets);
  const rotateSecret = useAdvancedStore((s) => s.rotateSecret);

  function rotate(sec: VaultSecret): void {
    rotateSecret(sec.id);
    toast.success(`Rotated ${sec.name}`);
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Secrets vault" subtitle="Masked secrets with rotation policy enforcement" />
      <div className="space-y-2">
        {secrets.map((sec) => {
          const state = rotationState(sec);
          return (
            <Card key={sec.id} className="flex items-center gap-3">
              <span className="font-mono text-sm text-slate-800">{sec.name}</span>
              <code className="text-xs text-slate-400">{sec.hint}</code>
              <Badge tone={STATE_TONE[state]}>{state}</Badge>
              <span className="text-[11px] text-slate-400">
                rotated {daysSince(sec.lastRotated)}d ago · every {sec.rotationDays}d
              </span>
              <Btn variant={state === 'overdue' ? 'primary' : 'ghost'} onClick={() => rotate(sec)}>
                Rotate
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
