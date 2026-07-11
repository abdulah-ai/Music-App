import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { palette } from '../../theme/theme';

type Props = {
  size?: number;
  /** Render the mark as a single flat colour (Android monochrome adaptive icon, dark UI chrome). */
  monochrome?: string;
};

/**
 * The Starhollow mark: one radiant star settling into a hollow — a dark
 * clearing ringed by two pine ridges, with an aurora pool glowing where the
 * ridges part. The big four-point star is what survives favicon size; the
 * V-notch treeline is what keeps it from reading as a generic sparkle.
 */
export function BrandMark({ size = 32, monochrome }: Props) {
  const star = monochrome ?? palette.gold;
  const ridgeNear = monochrome ?? '#04120C';
  const ridgeFar = monochrome ?? '#0A2018';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {!monochrome && (
        <Defs>
          <RadialGradient id="sh-pool" cx="50%" cy="78%" r="46%">
            <Stop offset="0%" stopColor={palette.primary} stopOpacity={0.5} />
            <Stop offset="60%" stopColor={palette.primary} stopOpacity={0.16} />
            <Stop offset="100%" stopColor={palette.primary} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="sh-glow" cx="50%" cy="36%" r="40%">
            <Stop offset="0%" stopColor={palette.gold} stopOpacity={0.4} />
            <Stop offset="100%" stopColor={palette.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
      )}
      {/* Aurora pool rising out of the hollow. */}
      {!monochrome && <Circle cx={50} cy={78} r={44} fill="url(#sh-pool)" />}
      {/* Far ridge — parts in the middle to form the hollow. */}
      <Path d="M-2,74 L16,48 L30,66 L40,52 L50,68 L60,52 L70,66 L84,48 L102,74 L102,102 L-2,102 Z" fill={ridgeFar} opacity={monochrome ? 0.55 : 1} />
      {/* Near ridge — lower, darker, framing the pool. */}
      <Path d="M-2,88 L14,68 L28,82 L42,70 L58,70 L72,82 L86,68 L102,88 L102,102 L-2,102 Z" fill={ridgeNear} />
      {/* Star glow halo. */}
      {!monochrome && <Circle cx={50} cy={36} r={32} fill="url(#sh-glow)" />}
      {/* The star: long four-point with a slim second cross. */}
      <Path
        d="M50,10 L54,30 L72,36 L54,42 L50,62 L46,42 L28,36 L46,30 Z"
        fill={star}
      />
      <Path d="M50,26 L51.6,34.4 L60,36 L51.6,37.6 L50,46 L48.4,37.6 L40,36 L48.4,34.4 Z" fill={monochrome ?? '#FFF7DE'} opacity={monochrome ? 0 : 0.9} />
      {/* Companion stars. */}
      <Circle cx={22} cy={20} r={1.9} fill={star} opacity={0.85} />
      <Circle cx={79} cy={16} r={1.4} fill={star} opacity={0.65} />
      <Circle cx={87} cy={34} r={1.2} fill={star} opacity={0.55} />
    </Svg>
  );
}

export default BrandMark;
