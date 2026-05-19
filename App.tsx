import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './app/screens/DashboardScreen';
import { DataUpdateScreen } from './app/screens/DataUpdateScreen';
import { FailedQueueScreen } from './app/screens/FailedQueueScreen';
import { FieldTestScreen } from './app/screens/FieldTestScreen';
import { LoginScreen } from './app/screens/LoginScreen';
import { MessagesScreen } from './app/screens/MessagesScreen';
import { NewSaleScreen } from './app/screens/NewSaleScreen';
import { OpenDocumentsScreen } from './app/screens/OpenDocumentsScreen';
import { QRAlbumScreen } from './app/screens/QRAlbumScreen';
import { SettingsScreen } from './app/screens/SettingsScreen';
import { colors } from './app/theme';
import { HoneywellPreviewFrame } from './components/HoneywellPreviewFrame';
import { clearSession, loadSession, saveSession } from './storage/localStorage';
import type { AppScreen, UserSession } from './types';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [session, setSession] = useState<UserSession | null>(null);
  const [backHint, setBackHint] = useState('');
  const lastBackPressRef = useRef(0);
  const backHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSession().then((savedSession) => {
      if (savedSession) {
        setSession(savedSession);
        setScreen('dashboard');
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen !== 'dashboard' && screen !== 'login') {
        setScreen('dashboard');
        setBackHint('');
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }

      lastBackPressRef.current = now;
      setBackHint('Çıkmak için tekrar geri tuşuna basın');
      if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
      backHintTimerRef.current = setTimeout(() => setBackHint(''), 2000);
      return true;
    });

    return () => {
      subscription.remove();
      if (backHintTimerRef.current) clearTimeout(backHintTimerRef.current);
    };
  }, [screen]);

  const handleLogin = async (nextSession: UserSession) => {
    setSession(nextSession);
    await saveSession(nextSession);
    setBackHint('');
    setScreen('dashboard');
  };

  const navigateTo = (nextScreen: AppScreen) => {
    setBackHint('');
    setScreen(nextScreen);
  };

  const handleLogout = async () => {
    await clearSession();
    setSession(null);
    setBackHint('');
    setScreen('login');
  };

  const renderScreen = () => {
    if (screen === 'login') return <LoginScreen onLogin={handleLogin} systemMessage={backHint} />;
    if (screen === 'newSale') return <NewSaleScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'openDocuments') return <OpenDocumentsScreen onBack={() => navigateTo('dashboard')} onNavigate={navigateTo} />;
    if (screen === 'qrAlbum') return <QRAlbumScreen onBack={() => navigateTo('dashboard')} onNavigate={navigateTo} />;
    if (screen === 'messages') return <MessagesScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'failedQueue') return <FailedQueueScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'dataUpdate') return <DataUpdateScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'fieldTest') return <FieldTestScreen onBack={() => navigateTo('dashboard')} />;
    if (screen === 'settings') return <SettingsScreen onBack={() => navigateTo('dashboard')} onLogout={handleLogout} session={session} />;
    return <DashboardScreen session={session} onNavigate={navigateTo} systemMessage={backHint} />;
  };

  const appContent = (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={colors.anthracite} />
        {renderScreen()}
      </View>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return <HoneywellPreviewFrame>{appContent}</HoneywellPreviewFrame>;
  }

  return appContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
