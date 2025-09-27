import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

const { width, height } = Dimensions.get('window');

const onboardingSlides = [
  {
    key: '1',
    title: 'No Excuses',
    subtitle: 'Just Do The\nWorkout',
    quote:
      "“Fitness is not about being better than someone else. It's about being better than you used to be.”",
    image: require('../../../assets/gym1.jpg'),
  },
  {
    key: '2',
    title: 'Book Classes',
    subtitle: 'With Ease',
    quote: 'Browse schedules, view class details, and reserve your spot in seconds.',
    image: require('../../../assets/gym2.jpg'),
  },
  {
    key: '3',
    title: 'Track Performance',
    subtitle: 'And See Results',
    quote:
      'Log your scores, monitor your improvements, and stay motivated on your fitness journey.',
    image: require('../../../assets/gym3.jpg'),
  },
];

type OnboardingScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Onboarding'>;

interface OnboardingScreenProps {
  navigation: OnboardingScreenNavigationProp;
}

const OnboardingScreen = ({ navigation }: OnboardingScreenProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      navigation.replace('Login');
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      // Still navigate even if async storage fails
      navigation.replace('Login');
    }
  };

  const renderSlide = ({ item }: { item: (typeof onboardingSlides)[0] }) => (
    <ImageBackground source={item.image} style={styles.slide} resizeMode="cover">
      <View style={styles.overlay} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.quote}>{item.quote}</Text>
      </View>
    </ImageBackground>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <FlatList
        ref={flatListRef}
        data={onboardingSlides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.key}
      />
      <View style={[styles.footer, { paddingBottom: 20 }]}>
        <View style={styles.pagination}>
          {onboardingSlides.map((_, index) => (
            <View
              key={index}
              style={[styles.paginationDot, currentIndex === index && styles.paginationDotActive]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width: width,
    height: height,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  textContainer: {
    padding: 30,
    marginBottom: 120,
  },
  title: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 52,
  },
  subtitle: {
    color: '#D8FF3E',
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 52,
    marginBottom: 20,
  },
  quote: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 30,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#D8FF3E',
  },
  button: {
    backgroundColor: '#D8FF3E',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
  },
  buttonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OnboardingScreen;
