import { Tabs } from '@/components/ui';
import { DemandTab } from './DemandTab';
import { PersonaTab } from './PersonaTab';
import { SituationsTab } from './SituationsTab';

export function SetupPage() {
  return (
    <div className="stack">
      <h1>Set the stage</h1>
      <Tabs
        tabs={[
          { id: 'persona', label: '1 · Character card', content: <PersonaTab /> },
          { id: 'situations', label: '2 · Situations', content: <SituationsTab /> },
          { id: 'demand', label: '3 · Demand document', content: <DemandTab /> },
        ]}
      />
    </div>
  );
}
