import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import IconLogo from '../../components/common/IconLogo';

const { width } = Dimensions.get('window');

export default function PendingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header Logo */}
      <View style={styles.headerContainer}>
        <IconLogo width={60} height={58} />
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Warning Icon with Gradient Circles */}
        <View style={styles.warningContainer}>
          {/* Outer gradient ring */}
          <LinearGradient
            colors={['#6B8E23', '#8FBC8F', '#9ACD32']}
            style={styles.outerRing}
          >
            <View style={styles.outerRingInner}>
              {/* Middle gradient ring */}
              <LinearGradient
                colors={['#8FBC8F', '#9ACD32', '#ADFF2F']}
                style={styles.middleRing}
              >
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
          Your account status is pending and is waiting for review
          from the gym manager. We will notify you when you're
          account has been approved
        </Text>
      </View>

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
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
}); 