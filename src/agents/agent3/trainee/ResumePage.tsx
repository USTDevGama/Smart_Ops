import { useState } from 'react';
import { Alert, type AlertKind } from '@/components/ui';
import { ApiError, useApi } from '../api';
import { DocumentRow } from '../components/DocumentRow';
import { FileUploader } from '../components/FileUploader';
import { isWorking } from '../components/StatusBadge';
import { useAsync, usePolling } from '../hooks/useAsync';

export function ResumePage() {
  const api = useApi();
  const profiles = useAsync(() => api.listProfiles(), []);
  const [flash, setFlash] = useState<{ kind: AlertKind; text: string }>();

  const list = profiles.data ?? [];
  usePolling(
    list.some((p) => isWorking(p.status)),
    2000,
    profiles.reload,
  );

  async function upload(file: File) {
    setFlash(undefined);
    try {
      const { reused } = await api.uploadProfile(file);
      setFlash(
        reused
          ? { kind: 'info', text: 'You uploaded this file before, so the earlier copy is used.' }
          : { kind: 'success', text: 'Uploaded. We are reading it now.' },
      );
      profiles.reload();
    } catch (e) {
      setFlash({ kind: 'error', text: e instanceof ApiError ? e.detail : 'Upload failed.' });
    }
  }

  return (
    <div className="stack">
      <div className="stack-sm">
        <h1>My resume</h1>
        <p className="caption">PDF, DOCX or TXT, up to 10 MB.</p>
      </div>
      {flash && <Alert kind={flash.kind}>{flash.text}</Alert>}
      <FileUploader label="Resume file" buttonLabel="Upload" onUpload={upload} />

      <h2>Your uploads</h2>
      {profiles.error && <Alert kind="error">{profiles.error}</Alert>}
      {!profiles.loading && !profiles.error && list.length === 0 && (
        <p>You have not uploaded a resume yet.</p>
      )}
      <div className="stack-sm">
        {list.map((p) => (
          <DocumentRow
            key={p.id}
            doc={p}
            loadText={() => api.getProfile(p.id)}
            onDelete={() => api.deleteProfile(p.id)}
            onDeleted={profiles.reload}
          />
        ))}
      </div>
    </div>
  );
}
