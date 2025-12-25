import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Header from '../components/Header';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { PhotoContext } from '../context/PhotoContext';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function CameraScreen({ navigation }) {
  const { setLatestPhoto } = React.useContext(PhotoContext);
  const { user } = React.useContext(AuthContext);
  const [cameraType, setCameraType] = useState('back');

  useEffect(() => {
    const openCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      let result;
      try {
        result = await ImagePicker.launchCameraAsync({ quality: 0.8, cameraType: cameraType, allowsEditing: false });
      } catch (err) {
        return;
      }
      if (!result.canceled) {
        let uri = result.assets && result.assets[0] && result.assets[0].uri;
        if (cameraType === 'front') {
          try {
            const manipulated = await ImageManipulator.manipulateAsync(uri, [{ flip: ImageManipulator.FlipType.Horizontal }], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
            uri = manipulated.uri;
          } catch (e) {}
        }
        setLatestPhoto(uri);
        try {
          // Resize ve compress et (Firestore 1MB limit için)
          const resized = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 800 } }], // Genişliği 800px'e düşür
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
            userId: user?.uid || null
          });
          
          // Base64 data URI formatında göster
          const base64Uri = `data:image/jpeg;base64,${base64}`;
          setLatestPhoto(base64Uri);
        } catch (e) {
          console.error('upload to firebase error', e);
        }
        navigation.navigate('Main', { screen: 'Home' });
      }
    };

    const unsub = navigation.addListener('focus', () => { openCamera(); });
    return unsub;
  }, [cameraType, navigation, setLatestPhoto]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Header navigation={navigation} title="Kamera" />
      <View style={{ padding: 20 }}>
        <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#ff4da6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }} onPress={() => setCameraType((t) => (t === 'back' ? 'front' : 'back'))}>
          <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', color: '#666' }}>Kamera açılacak...</Text>
      </View>
    </View>
  );
}
