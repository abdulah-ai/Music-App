import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '../../hooks/useResponsive';
import { contentGrid, space } from '../../theme/tokens';
import { RippleField } from './RippleField';

type Props = PropsWithChildren<{
  /** Cap for the centered content column on desktop. */
  maxWidth?: number;
  /** Shared reading-width presets for aligned phone, tablet, and desktop chapters. */
  width?: keyof typeof contentGrid.maxWidth;
}>;

/** Safe-area aware screen canvas with a static ambient layer and centered content. */
export function ScreenContainer({ children, maxWidth, width = 'standard' }: Props) {
  const insets = useSafeAreaInsets();
  const { isDesktop, isTablet } = useResponsive();
  const isFocused = useIsFocused();
  const grid = isDesktop ? contentGrid.desktop : isTablet ? contentGrid.tablet : contentGrid.phone;
  const resolvedMaxWidth = maxWidth ?? contentGrid.maxWidth[width];

  return (
    <View style={styles.root}>
      {isFocused ? <RippleField /> : null}
      <View
        style={[
          styles.content,
          { maxWidth: resolvedMaxWidth, paddingHorizontal: grid.inset },
          {
            paddingTop: insets.top + (isDesktop ? space.section.default : space.inset.control),
            paddingBottom: insets.bottom + space.inset.control,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
});
