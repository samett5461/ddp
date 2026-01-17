import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const lightTheme = {
  background: '#fff',
  text: '#000',
  subText: '#666',
  border: '#ddd',
  card: '#fff',
  cardBorder: '#eee',
  header: '#fff',
  headerBorder: '#eee',
  tabBar: '#fff',
  tabBarBorder: '#eee',
  tabBarActive: '#ff4da6',
  tabBarInactive: '#999',
  button: '#ff4da6',
  buttonText: '#fff',
  input: '#f5f5f5',
  inputText: '#000',
  inputBorder: '#ddd',
  danger: '#ff3b30',
  shadow: '#000',
};

export const darkTheme = {
  background: '#000',
  text: '#fff',
  subText: '#999',
  border: '#333',
  card: '#1c1c1e',
  cardBorder: '#2c2c2e',
  header: '#1c1c1e',
  headerBorder: '#333',
  tabBar: '#1c1c1e',
  tabBarBorder: '#2c2c2e',
  tabBarActive: '#ff4da6',
  tabBarInactive: '#666',
  button: '#ff4da6',
  buttonText: '#fff',
  input: '#2c2c2e',
  inputText: '#fff',
  inputBorder: '#3c3c3e',
  danger: '#ff453a',
  shadow: '#000',
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
