import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import IconLogo from '../../components/common/IconLogo';

const { width } = Dimensions.get('window');

export default function RoleSelectionScreen() {
  const navigation = useNavigation();

  const handleMemberPress = () => {
    console.log('Member selected');

    navigation.navigate('MemberTabs' as never);
  };

  const handleCoachPress = () => {
    console.log('Coach selected');
    navigation.navigate('Coach' as never);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Header Logo */}
      <View style={styles.headerContainer}>
        <IconLogo width={60} height={58} />
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Button Container */}
      <View style={styles.buttonContainer}>
        {/* Member Button */}
        <TouchableOpacity style={styles.memberButton} onPress={handleMemberPress}>
          <Text style={styles.memberButtonText}>Member</Text>
        </TouchableOpacity>

        {/* Coach Button */}
        <TouchableOpacity style={styles.coachButton} onPress={handleCoachPress}>
          <Text style={styles.coachButtonText}>Coach</Text>
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
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    paddingBottom: 60,
    gap: 8,
    marginHorizontal: 20,
  },
  memberButton: {
    backgroundColor: '#D8FF3E',
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 8,
  },
  memberButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
  },
  coachButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  coachButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
