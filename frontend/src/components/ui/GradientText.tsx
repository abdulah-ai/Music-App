import { Platform, Text, TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients } from '../../theme/theme';

type Props = {
  children: string;
  style?: TextStyle | TextStyle[];
  colors?: readonly [string, string, ...string[]];
  numberOfLines?: number;
};

/** Headline text filled with the aurora gradient (CSS background-clip on web, MaskedView elsewhere). */
export function GradientText({ children, style, colors = gradients.aurora, numberOfLines }: Props) {
  if (Platform.OS === 'web') {
    // react-native-web forwards unknown style props straight to CSS, so a
    // real gradient fill works here where MaskedView does not.
    const webGradient = {
      backgroundImage: `linear-gradient(96deg, ${colors.join(', ')})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
    } as unknown as TextStyle;
    return (
      <Text numberOfLines={numberOfLines} style={[style, webGradient]}>
        {children}
      </Text>
    );
  }

  return (
    <MaskedView
      maskElement={
        <Text numberOfLines={numberOfLines} style={[style, { backgroundColor: 'transparent' }]}>
          {children}
        </Text>
      }
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}>
        <Text numberOfLines={numberOfLines} style={[style, { opacity: 0 }]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
