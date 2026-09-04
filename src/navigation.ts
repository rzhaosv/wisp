import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Paywall: { fromOnboarding?: boolean } | undefined;
  Settings: undefined;
  SOS: undefined;
  Health: undefined;
  Stats: undefined;
  Taper: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
