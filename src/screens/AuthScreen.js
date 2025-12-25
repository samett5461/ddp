import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, Animated, Image, Easing, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AuthScreen() {
  const { loginAnonymously, loginWithEmail, registerWithEmail } = React.useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState(null); // 'login' veya 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [parolaTekrar, setParolaTekrar] = useState('');
  const [sozlesmeKabul, setSozlesmeKabul] = useState(false);
  const [buttonPosition] = useState(new Animated.Value(0));
  const [buttonOpacity] = useState(new Animated.Value(1));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageOpacity1] = useState(new Animated.Value(1));
  const [imageOpacity2] = useState(new Animated.Value(0));
  const [blurOpacity] = useState(new Animated.Value(0));
  const [formScale] = useState(new Animated.Value(0));
  const [formOpacity] = useState(new Animated.Value(0));
  const buttonRef = useRef(null);
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const images = [
    require('../../assets/1.jpg'),
    require('../../assets/2.jpg'),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        const nextIndex = (prev + 1) % images.length;
        
        // Fade out current image
        Animated.timing(prev === 0 ? imageOpacity1 : imageOpacity2, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start();
        
        // Fade in next image
        Animated.timing(nextIndex === 0 ? imageOpacity1 : imageOpacity2, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
        
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleGirisYap = () => {
    // Önce butonları kaybet ve blur ekle
    Animated.parallel([
      Animated.timing(buttonPosition, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(blurOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFormType('login');
      // Cin efekti: butonun konumundan ekranın ortasına büyüyerek gel
      Animated.parallel([
        Animated.timing(formScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleKayitOl = () => {
    // Önce butonları kaybet ve blur ekle
    Animated.parallel([
      Animated.timing(buttonPosition, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(blurOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFormType('register');
      // Cin efekti: butonun konumundan ekranın ortasına büyüyerek gel
      Animated.parallel([
        Animated.timing(formScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleLogin = async () => {
    if (!username || !password) {
      alert('Lütfen kullanıcı adı ve parola girin');
      return;
    }

    setLoading(true);
    try {
      // Email ile giriş yap (username email olarak kullanılıyor)
      await loginWithEmail(username, password);
    } catch (error) {
      console.error('Login failed:', error);
      let errorMessage = 'Giriş yapılamadı';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Kullanıcı bulunamadı';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Yanlış parola';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz email adresi';
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!ad || !soyad || !email || !parola || !parolaTekrar) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    if (parola !== parolaTekrar) {
      alert('Parolalar eşleşmiyor');
      return;
    }

    if (parola.length < 6) {
      alert('Parola en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    try {
      const displayName = `${ad} ${soyad}`;
      await registerWithEmail(email, parola, displayName);
    } catch (error) {
      console.error('Register failed:', error);
      let errorMessage = 'Kayıt olunamadı';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu email adresi zaten kullanılıyor';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz email adresi';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Parola çok zayıf';
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    // Animasyonları geri al
    Animated.parallel([
      Animated.timing(formScale, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(blurOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Form tipini sıfırla ve butonları geri getir
      setFormType(null);
      Animated.parallel([
        Animated.timing(buttonPosition, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const translateY = buttonPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  return (
    <View style={styles.container}>
      {/* Arka plan görselleri */}
      <View style={styles.backgroundContainer}>
        <Animated.View style={[styles.backgroundImage, { opacity: imageOpacity1 }]}>
          <Image source={images[0]} style={styles.backgroundImage} resizeMode="cover" />
        </Animated.View>
        <Animated.View style={[styles.backgroundImage, { opacity: imageOpacity2 }]}>
          <Image source={images[1]} style={styles.backgroundImage} resizeMode="cover" />
        </Animated.View>
      </View>

      {/* Blur overlay - yarı saydam overlay ile blur efekti */}
      <Animated.View style={[styles.blurOverlay, { opacity: blurOpacity }]} />

      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.title}>DDP</Text>
        </View>
        
        {!formType ? (
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: buttonOpacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <TouchableOpacity
              ref={buttonRef}
              style={styles.button}
              onPress={handleGirisYap}
              onLayout={(event) => {
                const { x, y, width, height } = event.nativeEvent.layout;
                setButtonLayout({ x, y, width, height });
              }}
            >
              <Text style={styles.buttonText} numberOfLines={1}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.registerButton]}
              onPress={handleKayitOl}
              onLayout={(event) => {
                const { x, y, width, height } = event.nativeEvent.layout;
                setButtonLayout({ x, y, width, height });
              }}
            >
              <Text style={styles.buttonText} numberOfLines={1}>Kayıt Ol</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : formType === 'login' ? (
          <Animated.View 
            style={[
              styles.loginForm,
              {
                opacity: formOpacity,
                transform: [
                  {
                    scale: formScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.1, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseForm}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.formContent}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Parola"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.formButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText} numberOfLines={1}>Giriş Yap</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <Animated.View 
            style={[
              styles.registerForm,
              {
                opacity: formOpacity,
                transform: [
                  {
                    scale: formScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.1, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseForm}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.formContent}>
              <TextInput
                style={styles.input}
                placeholder="Ad"
                value={ad}
                onChangeText={setAd}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Soyad"
                value={soyad}
                onChangeText={setSoyad}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Parola"
                value={parola}
                onChangeText={setParola}
                secureTextEntry
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Parola Tekrar"
                value={parolaTekrar}
                onChangeText={setParolaTekrar}
                secureTextEntry
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setSozlesmeKabul(!sozlesmeKabul)}
              >
                <View style={[styles.checkbox, sozlesmeKabul && styles.checkboxChecked]}>
                  {sozlesmeKabul && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Sözleşmeyi kabul ediyorum</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formButton, !sozlesmeKabul && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading || !sozlesmeKabul}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText} numberOfLines={1}>Kayıt Ol</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 32,
    width: '100%',
    zIndex: 1,
  },
  topSection: {
    marginTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff4da6',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 48,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
    paddingHorizontal: 32,
  },
  button: {
    backgroundColor: '#ff4da6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    minHeight: 44,
    minWidth: 120,
  },
  registerButton: {
    backgroundColor: '#ff9fcf',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginForm: {
    position: 'absolute',
    top: 0,
    left: 32,
    right: 32,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerForm: {
    position: 'absolute',
    top: 0,
    left: 32,
    right: 32,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  formContent: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRadius: 20,
  },
  formButton: {
    backgroundColor: '#ff4da6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    maxWidth: 300,
    width: '100%',
  },
  input: {
    width: '100%',
    maxWidth: 300,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#ffe6f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    maxWidth: 300,
    width: '100%',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ff4da6',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#ff4da6',
    borderColor: '#ff4da6',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ff9fcf',
    opacity: 0.6,
  },
});

