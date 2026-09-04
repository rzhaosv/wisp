import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from './src/theme';
import { AppProvider, useApp } from './src/store/AppContext';
import { RootStackParamList } from './src/navigation';
import { setupNotificationHandler } from './src/services/notifications';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SOSScreen from './src/screens/SOSScreen';
import HealthScreen from './src/screens/HealthScreen';
import StatsScreen from './src/screens/StatsScreen';
import TaperScreen from './src/screens/TaperScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.ink,
    primary: colors.accent,
    border: colors.line,
  },
};

function Root() {
  const { ready, state } = useApp();
  const [justOnboarded, setJustOnboarded] = useState(false);

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!state.onboarded) return <OnboardingScreen onDone={() => setJustOnboarded(true)} />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={justOnboarded ? 'Paywall' : 'Home'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SOS" component={SOSScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="Health" component={HealthScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
        <Stack.Screen name="Taper" component={TaperScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'modal' }}
          initialParams={justOnboarded ? { fromOnboarding: true } : undefined}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
