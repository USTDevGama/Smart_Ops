// Public learning resource behind each approved exercise, shown as a link on its card.
// Keyed by exercise ID. Each goal has one or more resources in the team's resource list; where a
// goal has two, the one that fits the exercise is chosen here. Exercises missing from this map
// simply show no link.

export type ResourceLink = { name: string; url: string };

const RESOURCE_BY_EXERCISE: Record<string, ResourceLink> = {
  'EX-01': { name: 'Google Technical Writing', url: 'https://developers.google.com/tech-writing' },
  'EX-02': { name: 'Atlassian Git Tutorials', url: 'https://www.atlassian.com/git/tutorials' },
  'EX-03': { name: 'OWASP WebGoat Hands-on Lab', url: 'https://owasp.org/www-project-webgoat/' },
  'EX-04': { name: 'OWASP Data Security Guidance', url: 'https://owasp.org/www-project-top-ten/' },
  'EX-05': { name: 'Python Testing with pytest Docs', url: 'https://docs.pytest.org/' },
  'EX-06': {
    name: 'Atlassian Team Communication Guide',
    url: 'https://www.atlassian.com/team-playbook',
  },
  'EX-07': {
    name: 'SBI Feedback Model (Center for Creative Leadership)',
    url: 'https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/',
  },
  'EX-08': {
    name: 'Coursera Communication Skills Articles',
    url: 'https://www.coursera.org/articles/communication-skills',
  },
  'EX-09': { name: 'Docker Getting Started', url: 'https://docs.docker.com/get-started/' },
  'EX-10': {
    name: 'Google SRE Incident Response',
    url: 'https://sre.google/sre-book/managing-incidents/',
  },
  'EX-11': {
    name: 'GitHub Pull Request Best Practices',
    url: 'https://docs.github.com/en/pull-requests',
  },
};

export function resourceForExercise(exerciseId: string): ResourceLink | undefined {
  return RESOURCE_BY_EXERCISE[exerciseId];
}
