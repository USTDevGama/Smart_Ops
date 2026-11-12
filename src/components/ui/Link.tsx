import type { AnchorHTMLAttributes } from 'react';
import { Link as RouterLink, type LinkProps } from 'react-router-dom';

/** Underlined by the global `a` rule (spec §5.2). Plain anchor for external URLs. */
export function ExternalLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}

/** In-app link. */
export function Link(props: LinkProps) {
  return <RouterLink {...props} />;
}
