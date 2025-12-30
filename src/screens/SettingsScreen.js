import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { safeAlert } from '../utils/alert';

export default function SettingsScreen({ navigation }) {
  const { logout, user } = React.useContext(AuthContext);

  const confirmLogout = () => {
    safeAlert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinize emin misiniz?',
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
    } catch (error) {
      console.error('Logout failed:', error);
      safeAlert('Hata', 'Çıkış yapılırken bir hata oluştu.');
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Ayarlar" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>Hesap</Text>
          <Text style={styles.sectionDesc}>Hesabınızla ilgili ayarlar ve çıkış işlemi</Text>
          <TouchableOpacity style={[styles.logoutButton, { marginTop: 12 }]} onPress={confirmLogout}>
            <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>

        {user && (
          <View style={styles.section}>
            <Text style={styles.label}>Kullanıcı ID</Text>
            <Text style={styles.value}>{user.uid}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  section: { marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginBottom: 4 },
  value: { fontSize: 16, color: '#000', fontFamily: 'monospace' },
  logoutButton: {
    backgroundColor: '#ff4da6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
