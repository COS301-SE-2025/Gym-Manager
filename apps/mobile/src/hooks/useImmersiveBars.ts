// apps/mobile/src/hooks/useImmersiveBars.ts
import * as React from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Optional Android nav bar control; safely no-op if not installed.
let NavigationBar: any = null;
try { NavigationBar = require('expo-navigation-bar'); } catch {}

export function useImmersiveBars() {
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        RNStatusBar.setHidden(true, 'fade');
        RNStatusBar.setTranslucent?.(true);
        RNStatusBar.setBackgroundColor?.('transparent');

        NavigationBar?.setBehaviorAsync?.('overlay-swipe').catch(() => {});
        NavigationBar?.setVisibilityAsync?.('hidden').catch(() => {});
      }
      return () => {
        if (Platform.OS === 'android') {
          RNStatusBar.setHidden(false, 'fade');
          NavigationBar?.setBehaviorAsync?.('inset-swipe').catch(() => {});
          NavigationBar?.setVisibilityAsync?.('visible').catch(() => {});
        }
      };
    }, [])
  );
}
