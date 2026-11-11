import clear12 from '@/assets/icons/IconClear12.svg?raw';
import edit12 from '@/assets/icons/IconEdit12.svg?raw';
import editSmall12 from '@/assets/icons/IconEditSmall12.svg?raw';
import errorMark12 from '@/assets/icons/IconErrorMark12.svg?raw';
import warningMark12 from '@/assets/icons/IconWarningMark12.svg?raw';
import warning12 from '@/assets/icons/IconWarning12.svg?raw';
import option16 from '@/assets/icons/IconOption16.svg?raw';

/** Icons whose colour is part of their meaning. They are never recoloured (spec §6). */
const FIXED_COLOUR = new Set(['error', 'warning-mark']);

const ICONS = {
  clear: { svg: clear12, size: 12 },
  edit: { svg: edit12, size: 12 },
  'edit-small': { svg: editSmall12, size: 12 },
  error: { svg: errorMark12, size: 12 },
  'warning-mark': { svg: warningMark12, size: 12 },
  warning: { svg: warning12, size: 12 },
  option: { svg: option16, size: 16 },
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  /** 12px icons stay at 12px; do not scale them up (spec §6). */
  size?: 12 | 16;
  /** Provide for meaningful icons. Omit for decorative ones (aria-hidden). */
  label?: string;
};

export function Icon({ name, size, label }: Props) {
  const def = ICONS[name];
  const px = size ?? def.size;
  const markup = FIXED_COLOUR.has(name)
    ? def.svg
    : def.svg.replace(/fill="#003C51"/g, 'fill="currentColor"');
  const sized = markup.replace(/width="\d+" height="\d+"/, `width="${px}" height="${px}"`);
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: 'inline-flex', lineHeight: 0, flex: 'none' }}
      dangerouslySetInnerHTML={{ __html: sized }}
    />
  );
}
