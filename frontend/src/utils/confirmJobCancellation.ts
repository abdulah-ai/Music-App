import { Alert, Platform } from 'react-native';

export function confirmJobCancellation(jobName: string): Promise<boolean> {
  const message = `Stop “${jobName}”? You can restart this import later from Activity.`;

  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : false);
  }

  return new Promise((resolve) => {
    Alert.alert('Cancel import?', message, [
      { text: 'Keep importing', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Cancel import', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
