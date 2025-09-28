import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import IconLogo from '../../components/common/IconLogo';
import { getUser, User } from '../../utils/authStorage';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import apiClient from '../../utils/apiClient';

type PaymentScreenNavigationProp = StackNavigationProp<AuthStackParamList>;

interface PaymentScreenProps {
  navigation: PaymentScreenNavigationProp;
}

interface PaymentPackage {
  packageId: number;
  name: string;
  description?: string;
  creditsAmount: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentScreen({ navigation }: PaymentScreenProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [currentCredits, setCurrentCredits] = useState<number>(0);

  const fetchPaymentPackages = async () => {
    try {
      setPackagesLoading(true);
      const response = await apiClient.get('/payments/packages');
      setPackages(response.data);
    } catch (error) {
      console.error('Failed to fetch payment packages:', error);
      Alert.alert('Error', 'Failed to load payment packages. Please try again.');
    } finally {
      setPackagesLoading(false);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getUser();
        console.log('Loaded user:', user);
        setCurrentUser(user);
        
        // Fetch current credits balance
        if (user?.userId) {
          const url = `/members/${user.userId}/credits`;
          console.log('Fetching credits for user ID:', user.userId);
          console.log('API URL:', url);
          const response = await apiClient.get(url);
          console.log('Credits response:', response.data);
          setCurrentCredits(response.data.creditsBalance || 0);
        } else {
          console.log('No user ID found, user:', user);
          Alert.alert('Error', 'User ID not found. Please log in again.');
        }
      } catch (error: any) {
        console.error('Failed to load user data:', error);
        console.error('Error details:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
          Alert.alert(
            'Account Not Found', 
            'Your account is not set up as a member. Please contact support or try logging in again.'
          );
        } else {
          Alert.alert('Error', 'Failed to load your account information. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
    fetchPaymentPackages();
  }, []);

  const handlePurchaseCredits = async (packageId: number) => {
    const selectedPackage = packages.find(pkg => pkg.packageId === packageId);
    if (!selectedPackage || !currentUser?.userId) return;

    setIsProcessing(true);

    try {
      // Mock payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Purchase credits using the new payment packages system
      const response = await apiClient.post(`/members/${currentUser.userId}/credits/purchase-package`, {
        packageId: selectedPackage.packageId,
        paymentMethod: 'mock_payment',
        externalTransactionId: `mock_${Date.now()}`,
      });

      if (response.data.success) {
        setCurrentCredits(response.data.newBalance);

        Alert.alert(
          'Payment Successful!',
          `You've successfully purchased ${response.data.creditsAdded} credits for ${formatPrice(selectedPackage.priceCents)}. Your new balance is ${response.data.newBalance} credits.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      Alert.alert(
        'Payment Failed',
        'There was an error processing your payment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (priceCents: number) => {
    return `R${(priceCents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D8FF3E" />
          <Text style={styles.loadingText}>Loading payment options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase Credits</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={24} color="#D8FF3E" />
            <Text style={styles.balanceTitle}>Current Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>{currentCredits} Credits</Text>
          <Text style={styles.balanceDescription}>
            Each credit allows you to book one class
          </Text>
        </View>

        {/* Credit Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Package</Text>
          
          {packagesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D8FF3E" />
              <Text style={styles.loadingText}>Loading packages...</Text>
            </View>
          ) : packages.length === 0 ? (
            <View style={styles.noPackagesContainer}>
              <Text style={styles.noPackagesText}>No packages available</Text>
            </View>
          ) : (
            packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.packageId}
                style={styles.packageCard}
                onPress={() => handlePurchaseCredits(pkg.packageId)}
                disabled={isProcessing || !pkg.isActive}
              >
                <View style={styles.packageHeader}>
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageCredits}>{pkg.creditsAmount} Credits</Text>
                    <Text style={styles.packagePrice}>{formatPrice(pkg.priceCents)}</Text>
                  </View>
                  <View style={styles.packageIcon}>
                    <Ionicons name="card-outline" size={32} color="#D8FF3E" />
                  </View>
                </View>
                
                <Text style={styles.packageDescription}>
                  {pkg.description || pkg.name}
                </Text>
                
                <View style={styles.packageFooter}>
                  <Text style={styles.packageValue}>
                    R{((pkg.priceCents / 100) / pkg.creditsAmount).toFixed(2)} per credit
                  </Text>
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#D8FF3E" />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#888" />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#D8FF3E" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Mock Payment System</Text>
              <Text style={styles.infoDescription}>
                This is a demonstration payment system. No real money will be charged. 
                Credits will be added to your account immediately after "payment".
                Prices are in South African Rands (ZAR).
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  balanceCard: {
    backgroundColor: '#2a2a2a',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D8FF3E',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  balanceAmount: {
    color: '#D8FF3E',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceDescription: {
    color: '#888',
    fontSize: 14,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  popularPackage: {
    borderColor: '#D8FF3E',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: 20,
    backgroundColor: '#D8FF3E',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  popularText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageCredits: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  packagePrice: {
    color: '#D8FF3E',
    fontSize: 20,
    fontWeight: '600',
  },
  packageIcon: {
    padding: 8,
  },
  packageDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  packageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageValue: {
    color: '#888',
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
  noPackagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noPackagesText: {
    color: '#888',
    fontSize: 16,
  },
});
