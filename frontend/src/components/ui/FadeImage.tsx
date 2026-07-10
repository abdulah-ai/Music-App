import { useRef } from 'react';
import { Animated, ImageStyle, StyleProp } from 'react-native';

type Props = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
};

/** Image that fades in as it loads instead of popping — covers feel placed, not pasted. */
export function FadeImage({ uri, style, resizeMode = 'cover' }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  return (
    <Animated.Image
      source={{ uri }}
      resizeMode={resizeMode}
      style={[style, { opacity }]}
      onLoad={() =>
        Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }).start()
      }
    />
  );
}
