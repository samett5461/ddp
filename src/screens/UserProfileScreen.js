import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions, TouchableOpacity, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';

export default function UserProfileScreen({ navigation, route }) {
  const { userId } = route.params;
  const { user } = React.useContext(AuthContext);
  const { theme } = React.useContext(ThemeContext);
  const [profileUser, setProfileUser] = useState(null);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchProfileData = React.useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfileUser(userData);
        setFollowersCount((userData.followers || []).length);
        setFollowingCount((userData.following || []).length);
      } else {
        setProfileUser({ username: 'ddp_user' });
        setFollowersCount(0);
        setFollowingCount(0);
      }
    } catch (err) {
      console.error('Error fetching profile user:', err);
      setProfileUser({ username: 'ddp_user' });
      setFollowersCount(0);
      setFollowingCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading) {
        fetchProfileData();
      }
    }, [fetchProfileData, loading])
  );

  useEffect(() => {
    // Kullanıcının fotoğraflarını çek
    const q = query(
      collection(db, 'photos'),
      where('userId', '==', userId)
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
    }, (err) => console.error('user photos error', err));

    return unsub;
  }, [userId]);

  const checkFollowStatus = React.useCallback(async () => {
    if (!user?.uid) return;
    try {
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (currentUserDoc.exists()) {
        const following = currentUserDoc.data().following || [];
        setIsFollowing(following.includes(userId));
      }
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  }, [user?.uid, userId]);

  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading) {
        checkFollowStatus();
      }
    }, [checkFollowStatus, loading])
  );

  const handleFollow = async () => {
    if (!user?.uid || isLoadingFollow) return;
    
    setIsLoadingFollow(true);
    try {
      const currentUserRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', userId);

      if (isFollowing) {
        // Takipten çık
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(user.uid)
        });
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        // Takip et
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(user.uid)
        });
        
        //BİLDİRİM GÖNDER
        await addDoc(collection(db, 'notifications'), {
          recipientId: userId,                    // Takip edilen kişinin ID'si
          senderId: user.uid,                     // Takip eden kişinin ID'si
          senderName: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
          message: 'seni takip etmeye başladı',
          type: 'follow',
          relatedId: null,
          read: false,
          createdAt: serverTimestamp()
        });
        
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
      
      // Profil verilerini yeniden yükle (anlık güncelleme için)
      await fetchProfileData();
      // Takip durumunu yeniden kontrol et (buton durumu için)
      await checkFollowStatus();
    } catch (err) {
      console.error('Error updating follow status:', err);
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const displayName = profileUser?.username || 'ddp_user';

  // İsim ve soyisim baş harflerini döndürür
  function getInitials(name) {
    if (!name) return 'DD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.header}
        />
        <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.headerBorder, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.button }]}>Profil</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.subText }}>Yüklenıyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.header}
      />
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.headerBorder, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.button }]}>{displayName}</Text>
        <View style={{ width: 24 }} />
      </View>

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
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: theme.text }]}>{followersCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Takipçi</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: theme.text }]}>{followingCount}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Takip</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.followButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.followButton,
            isFollowing 
              ? { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }
              : { backgroundColor: theme.button }
          ]}
          onPress={handleFollow}
          disabled={isLoadingFollow}
          activeOpacity={0.7}
        >
          {isLoadingFollow ? (
            <ActivityIndicator size="small" color={isFollowing ? theme.text : '#fff'} />
          ) : (
            <Text style={[
              styles.followButtonText,
              { color: isFollowing ? theme.text : '#fff' }
            ]}>
              {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={userPhotos}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={{ gap: 2 }}
        contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 2 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => navigation.navigate('PhotoDetail', { photo: item })}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.url }} style={styles.gridImage} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
  followButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  followButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  gridItem: { 
    width: (Dimensions.get('window').width - 8) / 3, 
    height: (Dimensions.get('window').width - 8) / 3, 
    marginBottom: 2,
  },
  gridImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridPlaceholder: { 
    flex: 1, 
    backgroundColor: '#fff0f6', 
    borderWidth: 1, 
    borderColor: '#ffe6f0' 
  },
});