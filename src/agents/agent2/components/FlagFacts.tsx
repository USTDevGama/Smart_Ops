import { parseSubject } from '../util/format';

/** Flag descriptions from the flags table, keyed by `flagKey(name)`. */
export type FlagDescriptions = Record<string, string>;

/**
 * The human-readable facts about one flag, shared by the review card and the output card:
 * description (flags table), trainee and source (both from the agent's `subject`), explanation (from the agent).
 */
export default function FlagFacts({
  flag,
  subject,
  explanation,
  description,
}: {
  flag: string;
  subject: string;
  explanation: string;
  /** From the flags table. undefined when the flag is not in the table any more (deleted or merged). */
  description: string | undefined;
}) {
  const { source, trainee } = parseSubject(subject);
  return (
    <dl className="mt-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
      <dt className="text-body">Description</dt>
      <dd className={description ? 'text-heading' : 'text-body'}>
        {description ?? 'Not available: this flag is no longer in the flags list.'}
      </dd>
      {trainee && (
        <>
          <dt className="text-body">Trainee</dt>
          <dd className="font-mono text-xs text-heading" aria-label={`Trainee for ${flag}`}>
            {trainee}
          </dd>
        </>
      )}
      <dt className="text-body">Source</dt>
      <dd className="font-mono text-xs text-heading" aria-label={`Source for ${flag}`}>
        {source}
      </dd>
      <dt className="text-body">Explanation</dt>
      <dd className="whitespace-pre-line leading-relaxed text-heading">{explanation}</dd>
    </dl>
  );
}
