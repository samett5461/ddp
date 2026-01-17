import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { safeAlert } from '../utils/alert';

export default function SettingsScreen({ navigation }) {
  const { logout, user, refreshUser } = React.useContext(AuthContext);
  const { theme, isDark, toggleTheme } = React.useContext(ThemeContext);
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

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

  const handleEditProfile = () => {
    const fullName = user?.displayName || '';
    const nameParts = fullName.split(' ');
    setFirstName(nameParts[0] || '');
    setLastName(nameParts.slice(1).join(' ') || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      safeAlert('Hata', 'Ad ve soyad boş olamaz.');
      return;
    }

    setIsSaving(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        safeAlert('Hata', 'Kullanıcı oturumu bulunamadı.');
        return;
      }
      
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      // Firebase Auth profile güncelle
      await updateProfile(currentUser, {
        displayName: fullName
      });

      // Firestore users koleksiyonunu güncelle
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        username: fullName,
        updatedAt: new Date()
      }, { merge: true });

      // Auth state'ini yenile - bu onAuthStateChanged'i tetikleyecek
      await currentUser.reload();

      // Tüm uygulamada anlık güncelleme için
      if (refreshUser) {
        await refreshUser();
      }

      safeAlert('Başarılı', 'Profiliniz güncellendi.');
      setEditModalVisible(false);
    } catch (error) {
      console.error('Update profile error:', error);
      safeAlert('Hata', 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const settingsItems = [
    {
      section: 'Görünüm',
      description: 'Uygulamanın görünümünü özelleştirin',
      items: [
        {
          id: 'theme',
          icon: isDark ? 'moon' : 'sunny',
          title: isDark ? 'Karanlık Tema' : 'Aydınlık Tema',
          subtitle: isDark ? 'Gözlerinizi korur' : 'Daha parlak görünüm',
          type: 'switch',
          value: isDark,
          onToggle: toggleTheme,
        },
      ],
    },
    {
      section: 'Uygulama',
      description: 'Uygulama tercihleri ve bilgileri',
      items: [
        {
          id: 'notifications',
          icon: 'notifications-outline',
          title: 'Bildirimler',
          subtitle: 'Bildirim ayarlarını yönetin',
          type: 'navigate',
          badge: 'Yakında',
        },
        {
          id: 'premium',
          icon: 'diamond-outline',
          title: 'Premium Hesap',
          subtitle: 'Reklamsız ve ek özellikler',
          type: 'navigate',
          badge: 'Yakında',
        },
        {
          id: 'privacy',
          icon: 'lock-closed-outline',
          title: 'Gizlilik',
          subtitle: 'Gizlilik ve güvenlik ayarları',
          type: 'navigate',
          badge: 'Yakında',
        },
        {
          id: 'storage',
          icon: 'folder-outline',
          title: 'Depolama',
          subtitle: 'Önbellek ve depolama yönetimi',
          type: 'navigate',
          badge: 'Yakında',
        },
      ],
    },
    {
      section: 'Destek',
      description: 'Yardım ve geri bildirim',
      items: [
        {
          id: 'help',
          icon: 'help-circle-outline',
          title: 'Yardım Merkezi',
          subtitle: 'Sık sorulan sorular ve rehberler',
          type: 'navigate',
        },
        {
          id: 'feedback',
          icon: 'chatbubble-outline',
          title: 'Geri Bildirim',
          subtitle: 'Görüşlerinizi bizimle paylaşın',
          type: 'navigate',
        },
        {
          id: 'about',
          icon: 'information-circle-outline',
          title: 'Hakkında',
          subtitle: 'DDP v1.0.0',
          type: 'navigate',
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header navigation={navigation} title="Ayarlar" />
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profil Kartı */}
        {user && (
          <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={32} color="#ff4da6" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {user.displayName || user.email || 'Kullanıcı'}
              </Text>
              <Text style={[styles.profileId, { color: theme.subText }]} numberOfLines={1}>
                {user.uid}
              </Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={20} color={theme.button} />
            </TouchableOpacity>
          </View>
        )}

        {/* Ayarlar Bölümleri */}
        {settingsItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{section.section}</Text>
            <Text style={[styles.sectionDesc, { color: theme.subText }]}>{section.description}</Text>
            
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              {section.items.map((item, itemIndex) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => item.type === 'navigate' && console.log('Navigate to', item.id)}
                    activeOpacity={item.type === 'switch' ? 1 : 0.7}
                    disabled={item.type === 'switch'}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5' }]}>
                      <Ionicons name={item.icon} size={22} color={theme.button} />
                    </View>
                    <View style={styles.settingContent}>
                      <View style={styles.settingTextContainer}>
                        <Text style={[styles.settingTitle, { color: theme.text }]}>{item.title}</Text>
                        <Text style={[styles.settingSubtitle, { color: theme.subText }]} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                      {item.badge && (
                        <View style={[styles.badge, { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0' }]}>
                          <Text style={[styles.badgeText, { color: theme.subText }]}>{item.badge}</Text>
                        </View>
                      )}
                      {item.type === 'switch' ? (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{ false: isDark ? '#3a3a3c' : '#ddd', true: '#ff4da6' }}
                          thumbColor='#fff'
                          ios_backgroundColor={isDark ? '#3a3a3c' : '#ddd'}
                        />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                      )}
                    </View>
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.card, borderColor: theme.danger }]} 
          onPress={confirmLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.danger} />
          <Text style={[styles.logoutButtonText, { color: theme.danger }]}>Çıkış Yap</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.subText }]}>
            DDP • Versiyon 1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.subText }]}>
            © 2026 Tüm hakları saklıdır
          </Text>
        </View>
      </ScrollView>

      {/* Düzenleme Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Profili Düzenle</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Ad</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Adınızı girin"
                placeholderTextColor={theme.subText}
                editable={!isSaving}
              />
              
              <Text style={[styles.inputLabel, { color: theme.text }]}>Soyad</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Soyadınızı girin"
                placeholderTextColor={theme.subText}
                editable={!isSaving}
              />
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.button },
                  isSaving && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  content: { 
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffddee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  editButton: {
    padding: 8,
  },
  section: { 
    marginBottom: 28,
  },
  sectionTitle: { 
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionDesc: { 
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginTop: 8,
    marginBottom: 24,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
