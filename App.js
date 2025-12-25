import React, { useState, useEffect, createContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
export const PhotoContext = createContext();

function Header({ navigation, title = 'DDP' }) {
  return (
    <SafeAreaView style={styles.header}>
      <View style={styles.headerInner}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity
          style={{ width: 40, alignItems: 'flex-end' }}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#ff4da6" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({ navigation }) {
  const { latestPhoto } = React.useContext(PhotoContext);
  const [feedPhotos, setFeedPhotos] = React.useState([]);
  const [randomPhoto, setRandomPhoto] = React.useState(null);

  React.useEffect(() => {
    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const arr = snapshot.docs.map((d) => {
        const data = d.data();
        if (data.base64) {
          const format = data.format || 'jpeg';
          data.url = `data:image/${format};base64,${data.base64}`;
        }
        return { id: d.id, ...data };
      });
      setFeedPhotos(arr);
      if (arr.length > 0) {
        const randomIndex = Math.floor(Math.random() * arr.length);
        setRandomPhoto(arr[randomIndex]);
      }
    }, (err) => console.error('photos snapshot error', err));
    return unsub;
  }, []);
  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      <View style={styles.homeContent}>
        <View style={styles.photoArea}>
          {randomPhoto ? (
            <Image source={{ uri: randomPhoto.url }} style={styles.photo} />
          ) : latestPhoto ? (
            <Image source={{ uri: latestPhoto }} style={styles.photo} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={48} color="#ff9fcf" />
              <Text style={styles.placeholderText}>Henüz fotoğraf yok</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function ProfileScreen({ navigation }) {
  // Simple Instagram-like profile mock
  const samplePhotos = Array.from({ length: 9 }).map((_, i) => ({ id: i, uri: null }));
  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="DDP" />
      <View style={styles.profileTop}>
        <View style={styles.profileAvatar}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>DD</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>ddp_user</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statNum}>12</Text><Text>Gönderi</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>340</Text><Text>Takipçi</Text></View>
            <View style={styles.stat}><Text style={styles.statNum}>180</Text><Text>Takip</Text></View>
          </View>
        </View>
      </View>
      <FlatList
        data={samplePhotos}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <View style={styles.gridPlaceholder} />
          </View>
        )}
      />
    </View>
  );
}

function SettingsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Ayarlar" />
      <View style={{ padding: 20 }}>
        <Text>Burada uygulama ayarları yer alır.</Text>
      </View>
    </View>
  );
}

function CameraScreen({ navigation }) {
  const { setLatestPhoto } = React.useContext(PhotoContext);
  const { user } = React.useContext(AuthContext);
  const [cameraType, setCameraType] = useState('back');

  useEffect(() => {
    const openCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      let result;
      try {
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          cameraType: cameraType,
          allowsEditing: false,
        });
      } catch (err) {
        return;
      }
      if (!result.canceled) {
        let uri = result.assets && result.assets[0] && result.assets[0].uri;
        if (cameraType === 'front') {
          try {
            const manipulated = await ImageManipulator.manipulateAsync(
              uri,
              [{ flip: ImageManipulator.FlipType.Horizontal }],
              { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
            );
            uri = manipulated.uri;
          } catch (e) {
            // ignore
          }
        }
        // show local image immediately
        setLatestPhoto(uri);
        // Base64'e çevir ve Firestore'a kaydet
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

    // open camera when this screen is focused
    const unsub = navigation.addListener('focus', () => {
      openCamera();
    });
    return unsub;
  }, [cameraType, navigation, setLatestPhoto]);

  return (
    <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <Header navigation={navigation} title="Kamera" />
      <View style={{ padding: 20 }}>
        <TouchableOpacity
          style={[styles.flipButton, { marginBottom: 16 }]}
          onPress={() => setCameraType((t) => (t === 'back' ? 'front' : 'back'))}
        >
          <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', color: '#666' }}>Kamera açılacak...</Text>
      </View>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ff4da6',
        tabBarStyle: { backgroundColor: '#fff' },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') return <Ionicons name="home-outline" size={size} color={color} />;
          if (route.name === 'Camera') return <Ionicons name="camera-outline" size={size} color={color} />;
          if (route.name === 'Profile') return <Ionicons name="person-outline" size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { user, loading } = React.useContext(AuthContext);
  const [latestPhoto, setLatestPhoto] = useState(null);

  if (loading) {
    return null;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <PhotoContext.Provider value={{ latestPhoto, setLatestPhoto }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </PhotoContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ffe6f0' },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ff4da6' },
  homeContent: { flex: 1, padding: 16 },
  photoArea: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffe6f0', alignItems: 'center', justifyContent: 'center' },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#ff9fcf', marginTop: 8 },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff' },
  flipButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ff4da6', alignItems: 'center', justifyContent: 'center' },
  profileTop: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ffddee' },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontWeight: '700', fontSize: 18 },
  statsRow: { flexDirection: 'row', marginTop: 8 },
  stat: { marginRight: 12, alignItems: 'center' },
  statNum: { fontWeight: '700' },
  gridItem: { width: (Dimensions.get('window').width - 48) / 3, height: (Dimensions.get('window').width - 48) / 3, marginBottom: 8 },
  gridPlaceholder: { flex: 1, backgroundColor: '#fff0f6', borderWidth: 1, borderColor: '#ffe6f0' },
});
