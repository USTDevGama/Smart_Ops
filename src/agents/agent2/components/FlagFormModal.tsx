import { useState } from 'react';
import type { Flag, FlagInput } from '../api/types';
import Button from './Button';
import { fieldClass, labelClass } from './fieldStyles';
import Modal from './Modal';

export const emptyFlag: FlagInput = { name: '', description: '', enabled: true };

/** Shared by the add/edit modal and the merge dialog. */
export function FlagFields({
  value,
  onChange,
}: {
  value: FlagInput;
  onChange: (v: FlagInput) => void;
}) {
  const set = <K extends keyof FlagInput>(k: K, v: FlagInput[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="f-name" className={labelClass}>
          Name
        </label>
        <input
          id="f-name"
          className={fieldClass}
          value={value.name}
          onChange={(e) => set('name', e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="f-desc" className={labelClass}>
          Description{' '}
          <span className="font-normal text-body">(what the agent should look for)</span>
        </label>
        <textarea
          id="f-desc"
          rows={3}
          className={fieldClass}
          value={value.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-heading">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set('enabled', e.target.checked)}
        />
        Active (the agent checks this flag)
      </label>
    </div>
  );
}

export default function FlagFormModal({
  flag,
  onSave,
  onClose,
}: {
  flag: Flag | null; // null = add
  onSave: (input: FlagInput) => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState<FlagInput>(
    flag ? { name: flag.name, description: flag.description, enabled: flag.enabled } : emptyFlag,
  );
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      title={flag ? 'Edit flag' : 'Add flag'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!value.name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(value);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <FlagFields value={value} onChange={setValue} />
    </Modal>
  );
}
