import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions, Image, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import Header from '../components/Header';

export default function ProfileScreen({ navigation }) {
  const { user } = React.useContext(AuthContext);
  const { theme } = React.useContext(ThemeContext);
  const [userPhotos, setUserPhotos] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [displayedFollowers, setDisplayedFollowers] = useState([]);
  const [displayedFollowing, setDisplayedFollowing] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' veya 'list'

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'photos'),
      where('userId', '==', user.uid)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const photos = snapshot.docs.map((d) => {
        const data = d.data();
        if (data.base64) {
          const format = data.format || 'jpeg';
          data.url = `data:image/${format};base64,${data.base64}`;
        }
        return { id: d.id, ...data };
      });
      // Client-side sıralama
      photos.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
      setUserPhotos(photos);
    }, (err) => console.error('profile photos error', err));

    return unsub;
  }, [user?.uid]);

  const fetchFollowCounts = React.useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const followerIds = userData.followers || [];
        const followingIds = userData.following || [];
        
        setFollowersCount(followerIds.length);
        setFollowingCount(followingIds.length);
      }
    } catch (err) {
      console.error('Error fetching follow counts:', err);
    }
  }, [user?.uid]);

  useFocusEffect(
    React.useCallback(() => {
      fetchFollowCounts();
    }, [fetchFollowCounts])
  );

  const displayName = user?.profile?.username || user?.displayName || 'ddp_user';

  // İsim ve soyisim baş harflerini döndürür
  function getInitials(name) {
    if (!name) return 'DD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const fetchFollowList = async (type) => {
    if (!user?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const ids = type === 'followers' 
          ? (userData.followers || []) 
          : (userData.following || []);
        
        // Kullanıcı listesini çek
        const usersData = await Promise.all(
          ids.map(async (id) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', id));
              if (userDoc.exists()) {
                return { id, ...userDoc.data() };
              }
              return { id, username: 'ddp_user' };
            } catch {
              return { id, username: 'ddp_user' };
            }
          })
        );
        
        if (type === 'followers') {
          setFollowers(usersData);
          setDisplayedFollowers(usersData);
          setFollowersCount(usersData.length);
        } else {
          setFollowing(usersData);
          setDisplayedFollowing(usersData);
          setFollowingCount(usersData.length);
        }
      }
    } catch (err) {
      console.error('Error fetching follow list:', err);
    }
  };

  const openFollowersModal = async () => {
    setModalType('followers');
    setModalVisible(true);
    // Her iki listeyi de fetch et ki buton durumları doğru gözüksün
    await Promise.all([
      fetchFollowList('followers'),
      fetchFollowList('following')
    ]);
  };

  const openFollowingModal = async () => {
    setModalType('following');
    setModalVisible(true);
    // Her iki listeyi de fetch et ki buton durumları doğru gözüksün
    await Promise.all([
      fetchFollowList('following'),
      fetchFollowList('followers')
    ]);
  };

  const closeModal = () => {
    setModalVisible(false);
  };
  const handleFollowUser = async (targetUserId, isCurrentlyFollowing) => {
    if (!user?.uid) return;
    
    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', targetUserId);

      if (isCurrentlyFollowing) {
        // Takipten çık
        await updateDoc(currentUserRef, {
          following: arrayRemove(targetUserId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(user.uid)
        });
      } else {
        // Takip et
        await updateDoc(currentUserRef, {
          following: arrayUnion(targetUserId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(user.uid)
        });
        
        // 🔔 BİLDİRİM GÖNDER
        await addDoc(collection(db, 'notifications'), {
          recipientId: targetUserId,
          senderId: user.uid,
          senderName: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
          message: 'seni takip etmeye başladı',
          type: 'follow',
          relatedId: null,
          read: false,
          createdAt: serverTimestamp()
        });
      }
      
      // Sadece following state'ini güncelle (buton durumları için)
      // Listeleri yenileme ki kullanıcı yanlışlıkla takipten çıktıysa geri takip edebilsin
      const updatedUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (updatedUserDoc.exists()) {
        const userData = updatedUserDoc.data();
        const followingIds = userData.following || [];
        
        // Sadece following ID listesini güncelle
        const followingData = await Promise.all(
          followingIds.map(async (id) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', id));
              if (userDoc.exists()) {
                return { id, ...userDoc.data() };
              }
              return { id, username: 'ddp_user' };
            } catch {
              return { id, username: 'ddp_user' };
            }
          })
        );
        setFollowing(followingData);
        
        // Sayıları güncelle
        setFollowingCount(followingIds.length);
        const followerIds = userData.followers || [];
        setFollowersCount(followerIds.length);
      }
    } catch (err) {
      console.error('❌ Takip durumu güncelleme hatası:', err);
    }
  };
  const renderUserItem = ({ item }) => {
    // Kendi profilinizi göstermeyin
    if (item.id === user?.uid) {
      return null;
    }
    
    // Takip durumunu kontrol et
    const isFollowingUser = following.some(u => u.id === item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.userItem, { borderBottomColor: theme.border }]}
        activeOpacity={0.7}
        onPress={() => {
          closeModal();
          navigation.navigate('UserProfile', { userId: item.id });
        }}
      >
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {getInitials(item.username || 'U')}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.username}</Text>
          {item.bio && <Text style={[styles.userBio, { color: theme.subText }]}>{item.bio}</Text>}
        </View>
        <TouchableOpacity 
          style={[
            styles.followButton, 
            isFollowingUser 
              ? { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }
              : { borderColor: theme.button, borderWidth: 1 }
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleFollowUser(item.id, isFollowingUser);
          }}
        >
          <Text style={[
            styles.followButtonText, 
            { color: isFollowingUser ? theme.text : theme.button }
          ]}>
            {isFollowingUser ? 'Takibi Bırak' : 'Takip Et'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header navigation={navigation} title="Profil" />
      <View style={styles.profileTop}>
        <View style={styles.profileAvatar}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 24 }}>
            {getInitials(displayName || ' ')}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: theme.text }]}>{displayName}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: theme.text }]}>{userPhotos.length}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Gönderi</Text>
            </View>
            <TouchableOpacity style={styles.stat} onPress={openFollowersModal} activeOpacity={0.7}>
              <Text style={[styles.statNum, { color: theme.text }]}>{followersCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Takipçi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stat} onPress={openFollowingModal} activeOpacity={0.7}>
              <Text style={[styles.statNum, { color: theme.text }]}>{followingCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Takip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.viewToggle, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'grid' && { borderBottomColor: theme.text, borderBottomWidth: 2 }]}
          onPress={() => setViewMode('grid')}
        >
          <Ionicons name="grid" size={24} color={viewMode === 'grid' ? theme.text : theme.subText} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && { borderBottomColor: theme.text, borderBottomWidth: 2 }]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="menu" size={24} color={viewMode === 'list' ? theme.text : theme.subText} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={userPhotos}
        keyExtractor={(item) => String(item.id)}
        numColumns={viewMode === 'grid' ? 3 : 1}
        key={viewMode}
        columnWrapperStyle={viewMode === 'grid' ? { gap: 2 } : null}
        contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 2 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={viewMode === 'grid' ? styles.gridItem : styles.listItem}
            onPress={() => navigation.navigate('PhotoDetail', { photo: item })}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: item.url }} 
              style={viewMode === 'grid' ? styles.gridImage : styles.listImage} 
            />
            {viewMode === 'list' && (
              <View style={[styles.listOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                <View style={styles.listStats}>
                  <View style={styles.listStat}>
                    <Ionicons name="eye" size={20} color="#fff" />
                    <Text style={styles.listStatText}>
                      {item.viewCount ? item.viewCount.toLocaleString() : '0'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {modalType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            {(modalType === 'followers' ? displayedFollowers : displayedFollowing).length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name={modalType === 'followers' ? 'people-outline' : 'person-add-outline'} 
                  size={64} 
                  color={theme.subText} 
                />
                <Text style={[styles.emptyText, { color: theme.subText }]}>Liste boş</Text>
                <Text style={[styles.emptySubText, { color: theme.subText }]}>
                  {modalType === 'followers' 
                    ? 'Henüz takipçiniz yok' 
                    : 'Henüz kimseyi takip etmiyorsunuz'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={modalType === 'followers' ? displayedFollowers : displayedFollowing}
                keyExtractor={(item) => item.id}
                renderItem={renderUserItem}
                contentContainerStyle={{ paddingVertical: 8 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;
const itemSize = (screenWidth - 4) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileTop: {
    flexDirection: 'row',
    padding: 20,
    gap: 20,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ff4da6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  gridItem: {
    width: itemSize,
    height: itemSize,
    backgroundColor: '#eee',
  },
  gridImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  viewToggle: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  listItem: {
    width: '100%',
    height: screenWidth,
    backgroundColor: '#eee',
    marginBottom: 2,
    position: 'relative',
  },
  listImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  listStats: {
    flexDirection: 'row',
    gap: 16,
  },
  listStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listStatText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 300,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffddee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#ff4da6',
    fontWeight: '700',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userBio: {
    fontSize: 13,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
