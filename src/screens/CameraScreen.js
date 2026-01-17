import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Alert, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { PhotoContext } from '../context/PhotoContext';

export default function CameraScreen({ navigation }) {
  const { setLatestPhoto } = React.useContext(PhotoContext);
  const { user } = React.useContext(AuthContext);
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      let uri = photo.uri;

      // Ön kamera ise aynala
      if (facing === 'front') {
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            uri,
            [{ flip: ImageManipulator.FlipType.Horizontal }],
            { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = manipulated.uri;
        } catch (e) {
          console.error('flip error', e);
        }
      }

      // Önizleme ekranına geç
      setCapturedPhoto(uri);
    } catch (error) {
      console.error('take picture error', error);
    }
  };

  const handleShare = async () => {
    if (!capturedPhoto) return;

    setUploading(true);

    try {
      // show local image immediately
      setLatestPhoto(capturedPhoto);

      // Resize ve compress et
      const resized = await ImageManipulator.manipulateAsync(
        capturedPhoto,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Base64'e çevir
      const base64 = await FileSystem.readAsStringAsync(resized.uri, {
        encoding: 'base64',
      });

      // Firestore'a kaydet
      await addDoc(collection(db, 'photos'), {
        base64: base64,
        createdAt: serverTimestamp(),
        format: 'jpeg',
        userId: user?.uid || null,
        viewCount: 0,
      });

      // Base64 data URI formatında göster
      const base64Uri = `data:image/jpeg;base64,${base64}`;
      setLatestPhoto(base64Uri);

      navigation.navigate('Main', { screen: 'Home' });
    } catch (e) {
      console.error('upload to firebase error', e);
      setUploading(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Kamera izni gerekli</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Önizleme ekranı
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
        
        <View style={styles.previewTopBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            disabled={uploading}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.previewBottomBar}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
            disabled={uploading}
          >
            <Ionicons name="camera-outline" size={28} color="#fff" />
            <Text style={styles.retakeText}>Yeniden Çek</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, uploading && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={28} color="#fff" />
                <Text style={styles.shareText}>Paylaş</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
      {/* Üst bar */}
      <View style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
        >
          <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
      {/* Alt bar */}
      <View style={styles.bottomBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: width,
    height: height,
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fff',
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#ff4da6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: width,
    height: height,
    resizeMode: 'cover',
  },
  previewTopBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  retakeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retakeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#ff4da6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 140,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
