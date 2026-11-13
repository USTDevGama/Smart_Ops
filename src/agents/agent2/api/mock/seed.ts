import type { FlagInput } from '../types';

/**
 * Seed flags for the mock backend. In production these live in the flags DB (admin-managed).
 * Currently the four flags the team agreed on: low-information, subtle-harsh, clique, other.
 */
export const SEED_FLAGS: FlagInput[] = [
  {
    name: 'low-information',
    description:
      'Feedback that is vague or generic and gives no specific behaviour, example or evidence (e.g. "not a good fit", "needs to improve attitude").',
    enabled: true,
  },
  {
    name: 'subtle-harsh',
    description:
      'Harsh or belittling tone delivered subtly: sarcasm, backhanded compliments, condescension or dismissive phrasing rather than overt insults.',
    enabled: true,
  },
  {
    name: 'clique',
    description:
      'Favouritism towards, or exclusion from, in-groups: preferring people who socialise together, share a background, or "fit the culture" rather than judging work performance.',
    enabled: true,
  },
  {
    name: 'other',
    description:
      'Any other potential bias that does not fit the flags above. Reviewers should describe the type of bias in the explanation.',
    enabled: true,
  },
];
