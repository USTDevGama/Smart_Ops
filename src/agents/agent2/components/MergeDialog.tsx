import { useState } from 'react';
import type { Flag, FlagInput } from '../api/types';
import Button from './Button';
import { FlagFields } from './FlagFormModal';
import Modal from './Modal';

/** Merge 2+ flags into one new flag. Defaults: first name and joined descriptions. */
export default function MergeDialog({
  sources,
  onMerge,
  onClose,
}: {
  sources: Flag[];
  onMerge: (target: FlagInput) => Promise<void>;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<FlagInput>({
    name: sources[0].name,
    description: Array.from(new Set(sources.map((s) => s.description))).join(' '),
    enabled: sources.some((s) => s.enabled),
  });
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      title={`Merge ${sources.length} flags`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!target.name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onMerge(target);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Merging…' : 'Merge into one flag'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-body">These flags will be replaced by a single flag:</p>
      <ul className="my-3 flex flex-wrap gap-2">
        {sources.map((s) => (
          <li
            key={s.id}
            className="rounded-sm border border-line bg-neu-50 px-2 py-0.5 text-xs font-medium text-heading"
          >
            {s.name}
          </li>
        ))}
      </ul>
      <p className="mb-3 text-sm font-medium text-heading">Resulting flag</p>
      <FlagFields value={target} onChange={setTarget} />
    </Modal>
  );
}
