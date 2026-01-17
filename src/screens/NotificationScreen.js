import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  Platform,
  FlatList,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import Header from '../components/Header';

// Bildirim Item Component
function NotificationItem({ item, theme, onPress, onMarkAsUnread, onDelete }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwipeOpen, setIsSwipeOpen] = useState(false);
  const SWIPE_THRESHOLD = 60; // Açılma için gereken minimum mesafe
  const SWIPE_MAX = 140; // Maksimum kaydırma
  const VELOCITY_THRESHOLD = 0.3; // Hızlı swipe için eşik

  // PanResponder ile swipe hareketi
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Yatay kaydırmada çalış, dikey kaydırmayı engelle
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMoved = Math.abs(gestureState.dx) > 8;
        return isHorizontal && hasMoved;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(translateX._value);
        translateX.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Açıkken: hem sağa hem sola kaydırabilir
        // Kapalıyken: sadece sola kaydırabilir
        if (isSwipeOpen) {
          // Açıkken: -140'dan başlayıp 0'a kadar sağa kaydırabilir
          const newValue = Math.max(-SWIPE_MAX, Math.min(0, gestureState.dx));
          translateX.setValue(newValue);
        } else {
          // Kapalıyken: 0'dan başlayıp -140'a kadar sola kaydırabilir
          if (gestureState.dx < 0) {
            const newValue = Math.max(-SWIPE_MAX, gestureState.dx);
            translateX.setValue(newValue);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateX.flattenOffset();
        
        const currentValue = translateX._value;
        const velocity = gestureState.vx;
        
        // Hızlı swipe kontrolü
        const isFastSwipe = Math.abs(velocity) > VELOCITY_THRESHOLD;
        
        // Açılma/kapanma kararı
        if (isFastSwipe) {
          // Hızlı swipe - yöne göre aç/kapat
          if (velocity < -VELOCITY_THRESHOLD) {
            // Sola hızlı swipe - aç
            animateToOpen();
          } else if (velocity > VELOCITY_THRESHOLD) {
            // Sağa hızlı swipe - kapat
            animateToClose();
          } else {
            // Normal threshold kontrolü
            decideFinalPosition(currentValue);
          }
        } else {
          // Yavaş swipe - pozisyona göre karar ver
          decideFinalPosition(currentValue);
        }
      },
      onPanResponderTerminate: () => {
        // İptal edilirse mevcut duruma geri dön
        if (isSwipeOpen) {
          animateToOpen();
        } else {
          animateToClose();
        }
      },
    })
  ).current;

  const decideFinalPosition = (currentValue) => {
    // -70'den daha solda ise aç, sağda ise kapat
    if (currentValue < -SWIPE_THRESHOLD) {
      animateToOpen();
    } else {
      animateToClose();
    }
  };

  const animateToOpen = () => {
    Animated.spring(translateX, {
      toValue: -SWIPE_MAX,
      useNativeDriver: true,
      friction: 9,
      tension: 40,
    }).start();
    setIsSwipeOpen(true);
  };

  const animateToClose = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 9,
      tension: 40,
    }).start();
    setIsSwipeOpen(false);
  };

  // Bildirim tipine göre ikon
  const getIcon = () => {
    switch (item.type) {
      case 'follow':
        return 'person-add';
      case 'like':
        return 'heart';
      case 'comment':
        return 'chatbubble';
      default:
        return 'notifications';
    }
  };

  // Zaman formatla
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Az önce';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Swipe Aksiyonları - Animasyonlu görünürlük */}
      <Animated.View 
        style={[
          styles.swipeActions,
          {
            opacity: translateX.interpolate({
              inputRange: [-140, -70, 0],
              outputRange: [1, 0.5, 0],
              extrapolate: 'clamp',
            }),
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FFA500' }]}
          onPress={() => {
            onMarkAsUnread(item.id);
            animateToClose();
          }}
        >
          <Ionicons name="mail-unread" size={20} color="#FFF" />
          <Text style={styles.actionText}>Okunmadı</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
          onPress={() => onDelete(item.id)}
        >
          <Ionicons name="trash" size={20} color="#FFF" />
          <Text style={styles.actionText}>Sil</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Ana Bildirim */}
      <Animated.View
        style={[
          styles.notificationWrapper,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[
            styles.notificationItem,
            { borderBottomColor: theme.border },
          ]}
          activeOpacity={0.7}
          onPress={() => {
            if (isSwipeOpen) {
              animateToClose();
            } else {
              onPress(item);
            }
          }}
          > 
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.button + '20' },
            ]}
          >
            <Ionicons name={getIcon()} size={22} color={theme.button} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.notificationText, { color: theme.text }]}>
              <Text style={{ fontWeight: '700' }}>{item.senderName}</Text>{' '}
              {item.message}
            </Text>
            <Text style={[styles.timeText, { color: theme.subText }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>

          <View
            style={[
              styles.unreadDot,
              { backgroundColor: !item.read ? theme.button : 'transparent' },
            ]}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
import { db } from '../../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

export default function NotificationScreen({ navigation }) {
  const { theme, isDark } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bildirime tıklama
  const handleNotificationPress = async (item) => {
    try {
      // Okunmadıysa okundu işaretle
      if (!item.read) {
        await updateDoc(doc(db, 'notifications', item.id), {
          read: true,
        });
      }

      // Bildirim tipine göre yönlendirme
      if (item.type === 'follow' && item.senderId) {
        navigation.navigate('UserProfile', { userId: item.senderId });
      } else if ((item.type === 'like' || item.type === 'comment') && item.relatedId) {
        // Fotoğraf detayına git (gelecekte eklenebilir)
        // navigation.navigate('PhotoDetail', { photoId: item.relatedId });
      }
    } catch (error) {
      console.log('Bildirim işleme hatası:', error);
    }
  };

  // Bildirim sil
  const handleDeleteNotification = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'notifications', itemId));
    } catch (error) {
      console.log('Bildirim silme hatası:', error);
    }
  };

  // Okunmadı işaretle
  const handleMarkAsUnread = async (itemId) => {
    try {
      await updateDoc(doc(db, 'notifications', itemId), {
        read: false,
      });
    } catch (error) {
      console.log('Okunmadı işaretleme hatası:', error);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid)
    );

    // Gerçek zamanlı dinleyici
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Client-side sıralama (en yeni önce)
      list.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        const timeA = a.createdAt.seconds || 0;
        const timeB = b.createdAt.seconds || 0;
        return timeB - timeA;
      });

      setNotifications(list);
      setLoading(false);
    }, (error) => {
      console.log('Bildirim dinleme hatası:', error);
      setLoading(false);
    });

    // Cleanup
    return () => unsubscribe();
  }, [user?.uid]);

  const renderItem = ({ item }) => (
    <NotificationItem
      item={item}
      theme={theme}
      onPress={handleNotificationPress}
      onMarkAsUnread={handleMarkAsUnread}
      onDelete={handleDeleteNotification}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.header}
      />

      {/* Header */}
      <Header navigation={navigation} title="Bildirimler" />
      {/* İçerik */}
      {loading ? null : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="notifications-outline"
            size={80}
            color={theme.subText}
          />
          <Text style={[styles.emptyText, { color: theme.subText }]}>
            Henüz bildirim yok
          </Text>
          <Text style={[styles.emptySubText, { color: theme.subText }]}>
            Sana gönderilen bildirimler burada görünecek
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
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
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  swipeContainer: {
    position: 'relative',
  },
  swipeActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 70,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  notificationWrapper: {
    width: '100%',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    marginTop: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
