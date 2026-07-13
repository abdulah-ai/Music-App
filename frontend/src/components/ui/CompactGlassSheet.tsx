import { PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '../../hooks/useResponsive';
import { glass, motion, radii, spacing } from '../../theme/tokens';
import { GlassPanel } from './GlassPanel';
import { IconButton } from './IconButton';

export type SheetAnchor = { x: number; y: number };

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  accessibilityLabel: string;
  closeAccessibilityLabel?: string;
  header?: ReactNode;
  anchor?: SheetAnchor | null;
  maxWidth?: number;
  maxHeightRatio?: number;
  scrollable?: boolean;
  bodyStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}>;

/**
 * Shared contextual surface for focused controls. It portals above shell
 * chrome, stays content-sized with a bounded scroll region, and uses the
 * same navy glass treatment on mobile and desktop.
 */
export function CompactGlassSheet({
  visible,
  onClose,
  accessibilityLabel,
  closeAccessibilityLabel = 'Close panel',
  header,
  anchor,
  maxWidth = 480,
  maxHeightRatio = 0.78,
  scrollable = false,
  bodyStyle,
  contentContainerStyle,
  testID,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isDesktop } = useResponsive();
  const [rendered, setRendered] = useState(visible);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => mounted && setReduceMotion(enabled));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    progress.stopAnimation();
    if (visible) {
      setRendered(true);
      if (reduceMotion) {
        progress.setValue(1);
        return;
      }
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.duration.base,
        easing: Easing.bezier(...motion.easing.decelerate),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!rendered) return;
    if (reduceMotion) {
      progress.setValue(0);
      setRendered(false);
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: motion.duration.fast,
      easing: Easing.bezier(...motion.easing.accelerate),
      useNativeDriver: true,
    }).start(({ finished }) => finished && setRendered(false));
  }, [progress, reduceMotion, rendered, visible]);

  if (!rendered) return null;

  const sideMargin = spacing.md;
  const panelWidth = Math.min(maxWidth, width - sideMargin * 2);
  const maxHeight = Math.max(240, height * maxHeightRatio - insets.top - insets.bottom);
  const anchorStyle: ViewStyle | null = isDesktop && anchor
    ? (() => {
        const left = Math.max(sideMargin, Math.min(width - panelWidth - sideMargin, anchor.x - panelWidth + 28));
        const below = anchor.y + spacing.sm;
        const measuredHeight = panelHeight || Math.min(maxHeight, 420);
        const top = below + measuredHeight <= height - sideMargin
          ? below
          : Math.max(sideMargin, anchor.y - measuredHeight - spacing.sm);
        return { position: 'absolute', left, top };
      })()
    : null;

  const animatedPanelStyle = {
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
    ],
  };

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          isDesktop ? styles.rootDesktop : styles.rootMobile,
          !isDesktop && { paddingBottom: insets.bottom + spacing.md },
        ]}
        accessibilityViewIsModal
      >
        <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: progress }]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
        />
        <Animated.View
          onLayout={(event) => setPanelHeight(Math.ceil(event.nativeEvent.layout.height))}
          style={[
            styles.animatedPanel,
            { width: panelWidth, maxHeight },
            anchorStyle,
            animatedPanelStyle,
          ]}
        >
          <GlassPanel
            style={styles.panel}
            overlayColor={glass.fillHeavy}
            edgeColor={glass.edge}
          >
            <View
              testID={testID}
              accessibilityLabel={accessibilityLabel}
              style={styles.content}
            >
              <View style={styles.headerRow}>
                <View style={styles.headerContent}>{header}</View>
                <IconButton icon="close" accessibilityLabel={closeAccessibilityLabel} onPress={onClose} />
              </View>
              {scrollable ? (
                <ScrollView
                  style={[styles.scrollBody, bodyStyle]}
                  contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={[styles.body, bodyStyle]}>{children}</View>
              )}
            </View>
          </GlassPanel>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md },
  rootMobile: { justifyContent: 'flex-end', alignItems: 'center' },
  rootDesktop: { justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.md },
  backdrop: { ...StyleSheet.absoluteFill as object, backgroundColor: 'rgba(2,5,10,0.68)' },
  // The full-screen dismiss Pressable is absolutely positioned. Keep the
  // panel in a higher stacking context so its controls remain clickable on
  // React Native Web (and therefore in the Capacitor app).
  animatedPanel: { position: 'relative', flexShrink: 1, zIndex: 1 },
  panel: { width: '100%', maxHeight: '100%', borderRadius: radii.xl },
  content: { flexShrink: 1, padding: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  headerContent: { flex: 1 },
  body: { flexShrink: 1 },
  scrollBody: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { paddingBottom: spacing.sm },
});
