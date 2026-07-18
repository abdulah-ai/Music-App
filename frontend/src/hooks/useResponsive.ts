import { useWindowDimensions } from 'react-native';

/** Width at which the app switches from the phone shell (bottom dock) to the desktop shell (left rail). */
export const DESKTOP_BREAKPOINT = 900;
export const TABLET_BREAKPOINT = 600;

/** Width of the persistent desktop navigation rail. */
export const RAIL_WIDTH = 260;

/**
 * One shared answer to "which shell are we in?" — screens and chrome
 * components all read the same breakpoint so the layout flips as a unit.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && !isDesktop;
  return {
    width,
    height,
    isDesktop,
    isTablet,
    isPhone: width < TABLET_BREAKPOINT,
    /** Extra-roomy desktop — safe for 4+ column grids. */
    isWide: width >= 1280,
    /** Horizontal space actually available to screen content. */
    contentWidth: isDesktop ? width - RAIL_WIDTH : width,
  };
}
