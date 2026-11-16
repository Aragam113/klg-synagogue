import { assetUrl } from '@/config/demo';

/** Original community artwork, exported from the supplied vector PDF. */
export const BrandMark = ({
  light = false,
  className = '',
}: {
  light?: boolean;
  className?: string;
}) => (
  <img
    className={className}
    src={assetUrl('/media/brand/synagogue-logo' + (light ? '-light' : '') + '.svg')}
    width={614}
    height={706}
    alt=""
    aria-hidden
    draggable={false}
  />
);
