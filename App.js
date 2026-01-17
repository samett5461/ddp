import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { PhotoContext } from './src/context/PhotoContext';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { db } from './firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import PhotoDetailScreen from './src/screens/PhotoDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NotificationScreen from './src/screens/NotificationScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home tab için stack navigator
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="PhotoDetail" component={PhotoDetailScreen} />
    </Stack.Navigator>
  );
}

// Profile tab için stack navigator
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="PhotoDetail" component={PhotoDetailScreen} />
    </Stack.Navigator>
  );
}

// Notification tab için stack navigator
function NotificationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationFeed" component={NotificationScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="PhotoDetail" component={PhotoDetailScreen} />
    </Stack.Navigator>
  );
}

function Tabs() {
  const { theme } = React.useContext(ThemeContext);
  const { user } = React.useContext(AuthContext);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Okunmamış bildirim sayısını dinle
  React.useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.log('Bildirim sayısı dinleme hatası:', error);
    });

    return () => unsubscribe();
  }, [user?.uid]);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarShowLabel: false,
        tabBarStyle: { 
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.tabBarBorder,
          height: 70,
          paddingBottom: 15,
          paddingTop: 8,
          elevation: 8,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          const iconSize = 28;
          
          if (route.name === 'Home') {
            iconName = focused ? 'dice' : 'dice-outline';
          } else if (route.name === 'Camera') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          
          // Kamera özel tasarım - Kabarık yuvarlak
          if (route.name === 'Camera') {
            return (
              <View style={[styles.cameraButton, { backgroundColor: theme.button }]}>
                <Ionicons name={iconName} size={30} color="#FFF" />
              </View>
            );
          }
          
          // Bildirim badge'i
          if (route.name === 'Notifications' && unreadCount > 0) {
            return (
              <View style={{ width: iconSize, height: iconSize }}>
                <Ionicons name={iconName} size={iconSize} color={color} />
                <View style={[styles.badge, { backgroundColor: '#ff4da6' }]}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              </View>
            );
          }
          
          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Ana Sayfa' }} />
      <Tab.Screen name="Notifications" component={NotificationStack} options={{ tabBarLabel: 'Bildirimler' }} />
      <Tab.Screen name="Camera" component={CameraScreen} options={{ tabBarLabel: 'Kamera' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Profil' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Ayarlar' }} />
    </Tab.Navigator>
  );
}

function MainApp() {
  const { user, loading } = React.useContext(AuthContext);
  const { isDark, theme } = React.useContext(ThemeContext);
  const [latestPhoto, setLatestPhoto] = useState(null);

  if (loading) {
    return null;
  }

  // Show auth screen when no user is authenticated
  if (!user) {
    return (
      <PhotoContext.Provider value={{ latestPhoto, setLatestPhoto }}>
        <AuthScreen />
        <StatusBar style={isDark ? "light" : "dark"} />
      </PhotoContext.Provider>
    );
  }

  return (
    <PhotoContext.Provider value={{ latestPhoto, setLatestPhoto }}>
      <NavigationContainer theme={{
        colors: {
          background: theme.background,
        }
      }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={Tabs} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={isDark ? "light" : "dark"} />
    </PhotoContext.Provider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  cameraButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
