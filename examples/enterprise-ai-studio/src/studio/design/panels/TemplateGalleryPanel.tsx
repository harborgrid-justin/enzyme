import { useAdvancedStore } from '../advancedStore';
import { SectionHeader, Btn, Badge, Card } from '../ui';
import { toast } from '../../ui/toast';

/** Feature #49 — installable template gallery. */
export function TemplateGalleryPanel(): React.ReactElement {
  const templates = useAdvancedStore((s) => s.templates);
  const installTemplate = useAdvancedStore((s) => s.installTemplate);

  return (
    <div className="space-y-4">
      <SectionHeader title="Template gallery" subtitle="Start from a vetted, on-brand starting point" />
      <div className="grid grid-cols-2 gap-3">
        {templates.map((t) => (
          <Card key={t.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{t.name}</span>
              <Badge tone="slate">{t.category}</Badge>
              {t.installed && <Badge tone="emerald">installed</Badge>}
            </div>
            <p className="text-xs text-slate-500">{t.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">{t.installs.toLocaleString()} installs</span>
              <Btn
                variant={t.installed ? 'ghost' : 'primary'}
                onClick={() => {
                  installTemplate(t.id);
                  toast.success(t.installed ? `Removed ${t.name}` : `Installed ${t.name}`);
                }}
              >
                {t.installed ? 'Remove' : 'Install'}
              </Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
