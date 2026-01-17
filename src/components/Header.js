import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemeContext } from '../context/ThemeContext';

export default function Header({ navigation, title = 'DDP' }) {
  const { theme } = useContext(ThemeContext);

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.header, borderBottomWidth: 1, borderBottomColor: theme.headerBorder }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 }}>
        <View style={{ width: 40 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.button }}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
    </SafeAreaView>
  );
}
