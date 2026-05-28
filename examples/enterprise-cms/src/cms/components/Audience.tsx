import { Bell, Globe2, MessageSquare, Users } from 'lucide-react';
import { Metric } from './PageHeader';
import { PageHeader } from './PageHeader';

export function Audience(): React.ReactElement {
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Audience intelligence"
        title="Segments and journeys"
        description="A CMS-facing audience view for campaign routing, localization, and personalization. (Static demo data — wire to a real segmentation service in production.)"
      />
      <div className="metric-grid">
        <Metric icon={<Globe2 />} label="Locales" value="12" detail="Ready for publish" />
        <Metric icon={<Users />} label="Segments" value="8" detail="Active audiences" />
        <Metric icon={<MessageSquare />} label="Messages" value="34" detail="In campaign map" />
        <Metric icon={<Bell />} label="Alerts" value="3" detail="Governance checks" />
      </div>
    </section>
  );
}
