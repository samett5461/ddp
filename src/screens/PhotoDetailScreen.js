import React, { useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions, ActivityIndicator, Text, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { PhotoContext } from '../context/PhotoContext';
import { db } from '../../firebaseConfig';
import { doc, deleteDoc } from 'firebase/firestore';
import { safeAlert } from '../utils/alert';

export default function PhotoDetailScreen({ navigation, route }) {
  const { photo } = route.params;
  const { theme } = React.useContext(ThemeContext);
  const { user } = React.useContext(AuthContext);
  const { setLatestPhoto } = React.useContext(PhotoContext);
  const [deleting, setDeleting] = useState(false);

  const isOwner = user && photo.userId === user.uid;

  const handleDelete = () => {
    safeAlert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive', 
          onPress: confirmDelete 
        },
      ],
      { cancelable: true }
    );
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'photos', photo.id));
      
      // Eğer son eklenen fotoğraf ise context'i temizle
      setLatestPhoto(null);
      
      safeAlert('Başarılı', 'Fotoğraf silindi', [
        { 
          text: 'Tamam', 
          onPress: () => navigation.goBack() 
        }
      ]);
    } catch (error) {
      console.error('Delete photo error:', error);
      safeAlert('Hata', 'Fotoğraf silinirken bir hata oluştu.');
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 54 }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backButton, { backgroundColor: theme.card }]}
          disabled={deleting}
        >
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        
        <View style={[styles.viewCountBadge, { backgroundColor: theme.card }]}>
          <Ionicons name="eye" size={20} color={theme.text} />
          <Text style={[styles.viewCountText, { color: theme.text }]}>
            {photo.viewCount ? photo.viewCount.toLocaleString() : '0'}
          </Text>
        </View>
        
        {isOwner && (
          <TouchableOpacity 
            onPress={handleDelete} 
            style={[styles.deleteButton, { backgroundColor: theme.danger }]}
            disabled={deleting}
          >
              {deleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="trash-outline" size={24} color="#fff" />
              )}
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.imageContainer}>
        <Image source={{ uri: photo.url }} style={styles.image} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  viewCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  viewCountText: {
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    padding: 10,
    borderRadius: 25,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  deleteButton: {
    padding: 10,
    borderRadius: 25,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
