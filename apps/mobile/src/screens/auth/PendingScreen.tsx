import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import IconLogo from '../../components/common/IconLogo';
import { getUserStatus } from './Model/userStatus';
import { getToken, removeToken, removeUser } from '../../utils/authStorage';
import { getUser, storeUser } from '../../utils/authStorage'
import { supabase } from '../../lib/supabase';
import axios from 'axios';
import config from '../../config';

const { width } = Dimensions.get('window');

export default function PendingScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const hasRedirectedRef = useRef(false);

  const checkStatus = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' as never }],
        } as never);
        return;
      }

      const userStatus = await getUserStatus();

      // If status is no longer pending, fetch full user and then navigate
      if (userStatus.membershipStatus !== 'pending') {
        try {
          const me = await axios.get(`${config.BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          await storeUser(me.data);
        } catch (e) {
          console.warn('Failed to fetch/store user after approval:', e);
          // fallback: at least store roles from status
          const existing = await getUser();
          await storeUser({ ...(existing || {}), roles: userStatus.roles });
        }
        if (userStatus.roles.includes('member') && userStatus.roles.includes('coach')) {
          navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' as never }] } as never);
        } else if (userStatus.roles.includes('member')) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MemberTabs' as never, params: { screen: 'Home' } as never }],
          } as never);
        } else if (userStatus.roles.includes('coach')) {
          navigation.reset({ index: 0, routes: [{ name: 'Coach' as never }] } as never);
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MemberTabs' as never, params: { screen: 'Home' } as never }],
          } as never);
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkStatus();
    setRefreshing(false);
  }, [checkStatus]);

  const handleLogout = async () => {
    try {
      await removeToken();
      await removeUser();
      await supabase.auth.signOut();

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' as never }],
        })
      );
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };


  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      checkStatus();

      const interval = setInterval(() => {
        if (isActive) checkStatus();
      }, 30000);
      return () => {
        isActive = false;
        clearInterval(interval);
      };
    }, [checkStatus]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header Logo */}
      <View style={styles.headerContainer}>
        <IconLogo width={60} height={58} />
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#D8FF3E"
            colors={['#D8FF3E']}
          />
        }
      >
        {/* Warning Icon with Gradient Circles */}
        <View style={styles.warningContainer}>
          {/* Outer gradient ring */}
          <LinearGradient colors={['#6B8E23', '#8FBC8F', '#9ACD32']} style={styles.outerRing}>
            <View style={styles.outerRingInner}>
              {/* Middle gradient ring */}
              <LinearGradient colors={['#8FBC8F', '#9ACD32', '#ADFF2F']} style={styles.middleRing}>
                <View style={styles.middleRingInner}>
                  {/* Inner gradient ring */}
                  <LinearGradient
                    colors={['#9ACD32', '#ADFF2F', '#FFFF00']}
                    style={styles.innerRing}
                  >
                    <View style={styles.innerRingInner}>
                      {/* Exclamation mark */}
                      <View style={styles.exclamationContainer}>
                        <View style={styles.exclamationBar} />
                        <View style={styles.exclamationDot} />
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>PENDING ACCOUNT</Text>

        {/* Description */}
        <Text style={styles.description}>
          Your account status is pending and is waiting for review from the gym manager. We will
          notify you when your account has been approved.
        </Text>

        {/* Pull to refresh hint */}
        <Text style={styles.refreshHint}>Pull down to check if your account has been approved</Text>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          If account status does not change within 48 hours,{'\n'}
          Contact the gym.
        </Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={28} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoutButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  warningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 80,
  },
  outerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRingInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRingInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRingInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFF00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exclamationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exclamationBar: {
    width: 18,
    height: 50,
    backgroundColor: '#000',
    borderRadius: 4,
    marginBottom: 8,
  },
  exclamationDot: {
    width: 18,
    height: 18,
    backgroundColor: '#000',
    borderRadius: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginHorizontal: 15,
  },
  footerContainer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
