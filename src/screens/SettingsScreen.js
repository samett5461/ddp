import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen({ navigation }) {
  const { logout, user } = React.useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Ayarlar" />
      <View style={styles.content}>
        {user && (
          <View style={styles.section}>
            <Text style={styles.label}>Kullanıcı ID</Text>
            <Text style={styles.value}>{user.uid}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
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
