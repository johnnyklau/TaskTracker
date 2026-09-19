const CLOUD_PATH_D =
  'M277.67798 0 C283.04221 0 288.43854 0 293.79211 0 C336.47449 5.3603282 363.14899 23.203476 375.29874 52.400383 C446.45749 48.506721 498.19412 103.714005 466.66434 157.89743 C477.14902 169.28307 485.89612 182.01894 489.05505 199.11267 C489.05505 204.00926 489.05505 208.89439 489.05505 213.79022 C479.6409 257.29556 439.13171 286.69345 372.62659 278.7793 C355.51526 301.11731 325.06747 323.4874 277.68793 320.70139 C253.1981 319.23499 236.16089 310.74084 221.24417 300.4212 C205.53276 308.99936 188.51695 315.73141 163.931625 315.80554 C107.053085 315.9324 69.003578 282.88425 68.081184 237.55334 C31.515785 226.94865 6.7501459 207.1537 0.0074404762 173.2818 C0.0074404762 168.38597 0.0074404762 163.479431 0.0074404762 158.604263 C7.4498591 125.039543 30.869097 103.956238 69.862312 95.018898 C67.51931 38.398109 145.516678 3.0178213 209.59338 27.962366 C224.84937 15.6272869 246.43396 2.1736791 277.67798 0 Z';

type CloudShapeProps = {
  /** Tailwind stroke-color utility, e.g. "stroke-outline" or "stroke-done". */
  strokeClassName?: string;
  strokeWidth?: number;
  className?: string;
};

/**
 * Vector-traced cloud outline. Path is inlined per instance (not <symbol>+<use>)
 * since raster/export pipelines drop fill/stroke inherited through <use>.
 */
export function CloudShape({
  strokeClassName = 'stroke-outline',
  strokeWidth = 2,
  className,
}: CloudShapeProps) {
  return (
    <svg
      viewBox="0 0 489.06 320.71"
      className={`absolute inset-0 h-full w-full overflow-visible ${className ?? ''}`}
    >
      <path
        className={`fill-cloud ${strokeClassName}`}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        d={CLOUD_PATH_D}
      />
    </svg>
  );
}
