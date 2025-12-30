import { Alert } from 'react-native';

export const safeAlert = (title, message, buttons, options) => {
  try {
    if (typeof Alert !== 'undefined' && Alert && typeof Alert.alert === 'function') {
      Alert.alert(title, message, buttons, options);
    } else {
      console.log('Alert:', title, message);
    }
  } catch (e) {
    console.warn('safeAlert error', e);
  }
};
