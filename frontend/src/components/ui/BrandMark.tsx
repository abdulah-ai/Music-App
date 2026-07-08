import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { palette } from '../../theme/theme';

type Props = {
  size?: number;
  /** Render the mark as a single flat colour (Android monochrome adaptive icon, dark UI chrome). */
  monochrome?: string;
};

/**
 * The Duskglen mark: a moon glimpsed through a pine treeline — the glow of a
 * private clearing at the edge of night. The glow halo and moon read fine
 * even reduced to favicon size; the treeline silhouette is what keeps it
 * distinct from a plain circle/orb.
 */
export function BrandMark({ size = 32, monochrome }: Props) {
  const moon = monochrome ?? palette.textPrimary;
  const trees = monochrome ?? palette.background;
  const star = monochrome ?? palette.textPrimary;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {!monochrome && (
        <Defs>
          <RadialGradient id="dg-glow" cx="50%" cy="42%" r="50%">
            <Stop offset="0%" stopColor={palette.primary} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={palette.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
      )}
      {!monochrome && <Circle cx={50} cy={38} r={40} fill="url(#dg-glow)" />}
      <Circle cx={50} cy={38} r={26} fill={moon} />
      <Circle cx={20} cy={18} r={1.8} fill={star} opacity={0.85} />
      <Circle cx={80} cy={24} r={1.4} fill={star} opacity={0.7} />
      {/* Treeline silhouette — cuts across the lower moon like a forest horizon. */}
      <Path d="M10,70 L25,42 L40,70 Z M32,70 L50,32 L68,70 Z M60,70 L75,42 L90,70 Z" fill={trees} />
      <Rect x={0} y={70} width={100} height={30} fill={trees} />
    </Svg>
  );
}

export default BrandMark;
