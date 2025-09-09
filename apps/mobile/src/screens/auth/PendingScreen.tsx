import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import IconLogo from '../../components/common/IconLogo';
import { getUserStatus } from './Model/userStatus';
import { getToken } from '../../utils/authStorage';

const { width } = Dimensions.get('window');

export default function PendingScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const checkStatus = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        return;
      }

      const userStatus = await getUserStatus();
      
      // If status is no longer pending, navigate to appropriate screen
      if (userStatus.membershipStatus !== 'pending') {
        if (userStatus.roles.includes('member') && userStatus.roles.includes('coach')) {
          navigation.navigate('RoleSelection' as never);
        } else if (userStatus.roles.includes('member')) {
          navigation.navigate('Home' as never);
        } else if (userStatus.roles.includes('coach')) {
          navigation.navigate('Coach' as never);
        } else {
          navigation.navigate('Home' as never);
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
      // Don't show alert on every refresh, just log the error
    }
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkStatus();
    setRefreshing(false);
  }, [checkStatus]);

  // Check status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [checkStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <SafeAreaView style={styles.container}>
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
            colors={["#D8FF3E"]}
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
        <Text style={styles.refreshHint}>
          Pull down to check if your account has been approved
        </Text>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          If account status does not change within 48 hours,{'\n'}
          Contact the gym.
        </Text>
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
    marginTop: 60,
    marginBottom: 40,
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
