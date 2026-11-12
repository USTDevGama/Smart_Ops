import { useState } from 'react';
import { Button, FilePicker } from '@/components/ui';

type Props = {
  /** Accessible name of the file input, e.g. "Resume file". */
  label: string;
  buttonLabel: string;
  accept?: string;
  onUpload: (file: File) => Promise<void>;
};

/** File chooser plus an Upload button, which stays disabled until a file is chosen. */
export function FileUploader({ label, buttonLabel, accept = '.pdf,.docx,.txt', onUpload }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row">
      <FilePicker label={label} accept={accept} file={file} onFile={setFile} />
      <Button onClick={submit} disabled={!file || busy}>
        {busy ? 'Uploading…' : buttonLabel}
      </Button>
    </div>
  );
}
