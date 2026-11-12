import { Link } from '@/components/ui';

export function NotFound() {
  return (
    <div className="stack">
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </div>
  );
}
