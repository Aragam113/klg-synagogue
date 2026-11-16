import { assetUrl } from '@/config/demo';

/** Original community artwork, exported from the supplied vector PDF. */
export const BrandMark = ({
  light = false,
  full = false,
  className = '',
}: {
  light?: boolean;
  full?: boolean;
  className?: string;
}) => (
  <img
    className={className}
    src={assetUrl(
      '/media/brand/synagogue-' + (full ? 'logo' : 'mark') + (light ? '-light' : '') + '.svg'
    )}
    width={full ? 614 : 252}
    height={full ? 706 : 295}
    alt=""
    aria-hidden
    draggable={false}
  />
);
