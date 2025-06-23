import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const DUMMY_MEMBERS = [
  { id: '1', name: 'John Pork 1', score: '1:42:11' },
  { id: '2', name: 'John Pork 2', score: '00:42:12' },
  { id: '3', name: 'John Pork 3', score: '' },
  { id: '4', name: 'John Pork 4', score: '00:15:09' },
  { id: '5', name: 'John Pork 5', score: '1:42:11' },
  { id: '6', name: 'John Pork 6', score: '1:42:00' },
  { id: '7', name: 'John Pork 7', score: '1:00:11' },
];

const CoachLiveClassScreen = () => {
  const [members, setMembers] = useState(DUMMY_MEMBERS);
  const navigation = useNavigation();

  const handleScoreChange = (text: string, id: string) => {
    setMembers(prevMembers =>
      prevMembers.map(member =>
        member.id === id ? { ...member, score: text } : member
      )
    );
  };

  const renderMemberItem = ({ item }: { item: typeof DUMMY_MEMBERS[0] }) => (
    <View style={styles.memberRow}>
      <Text style={styles.memberName}>{item.name}:</Text>
      <TextInput
        style={styles.scoreInput}
        value={item.score}
        onChangeText={(text) => handleScoreChange(text, item.id)}
        placeholder="input time"
        placeholderTextColor="#555"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.liveClassBanner}>
        <View style={styles.liveClassLeft}>
          <View style={styles.liveIndicator} />
          <View>
            <Text style={styles.liveLabel}>LIVE CLASS</Text>
            <Text style={styles.liveClassName}>Workout 1</Text>
          </View>
        </View>
        <View style={styles.liveClassRight}>
          <Text style={styles.liveInstructor}>Vansh Sood</Text>
          <Text style={styles.liveCapacity}>12/30</Text>
        </View>
      </View>
      <FlatList
        data={members}
        renderItem={renderMemberItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Submit Scores</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    width: '100%',
  },
  backButton: {
    backgroundColor: '#2a2a2a',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveClassBanner: {
    backgroundColor: '#D8FF3E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  liveClassLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#20C934',
    marginRight: 12,
  },
  liveLabel: {
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  liveClassName: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
  },
  liveClassRight: {
    alignItems: 'flex-end',
  },
  liveInstructor: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '500',
  },
  liveCapacity: {
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  listContainer: {
    paddingBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  memberName: {
    color: 'white',
    fontSize: 16,
  },
  scoreInput: {
    backgroundColor: '#2a2a2a',
    color: 'white',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: '40%',
    textAlign: 'center',
    fontSize: 16,
  },
  footer: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  submitButton: {
    backgroundColor: '#D8FF3E',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CoachLiveClassScreen; 