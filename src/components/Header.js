import React, { useContext } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { safeAlert } from '../utils/alert';

export default function Header({ navigation, title = 'DDP' }) {
  const { logout } = useContext(AuthContext);

  const confirmLogout = () => {
    safeAlert(
      'Çıkış Yap',
      'Çıkmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: handleLogout },
      ],
      { cancelable: true }
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout failed from header:', e);
      safeAlert('Hata', 'Çıkış yapılırken bir hata oluştu.');
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ffe6f0' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
        <View style={{ width: 40 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#ff4da6' }}>{title}</Text>
        <TouchableOpacity style={{ width: 40, alignItems: 'flex-end' }} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ff4da6" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
