import s16 from '@/assets/icons/SymbolOnCanvas16.svg';
import s24 from '@/assets/icons/SymbolOnCanvas24.svg';
import s32 from '@/assets/icons/SymbolOnCanvas32.svg';

const SRC = { 16: s16, 24: s24, 32: s32 } as const;

/** Placeholder symbol (spec §5.6). Sizes 16/24/32 only; never recoloured. */
export function Avatar({ size = 32 }: { size?: 16 | 24 | 32 }) {
  return <img src={SRC[size]} width={size} height={size} alt="" aria-hidden="true" />;
}
