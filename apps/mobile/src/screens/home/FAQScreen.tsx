import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const faqs = [
  {
    question: 'How do I book a class?',
    answer:
      'Go to the Home screen, browse upcoming classes, and tap "Book" on the class you want to join.',
  },
  {
    question: 'How do I cancel a class booking?',
    answer:
      'In the Home screen, find your booked classes and tap "Cancel" on the class you wish to cancel.',
  },
  {
    question: 'What is a live class?',
    answer:
      "A live class is a real-time session with a coach and other members. You can join and participate when it's in progress.",
  },
  {
    question: 'How do I submit my workout score?',
    answer: 'During a live class, enter your score in the input field and tap "Submit Score."',
  },
  {
    question: 'Can the coach update my score?',
    answer: 'Yes, coaches can update or override scores for any participant in a live class.',
  },
  {
    question: 'How do I view the leaderboard?',
    answer: 'Tap the "Leaderboard" tab to see the top scores for your current live class.',
  },
  {
    question: 'What if I miss a class?',
    answer: 'You can book another class from the upcoming classes list.',
  },
  {
    question: 'How do I update my profile information?',
    answer: 'Go to the Profile tab and tap "Edit" to update your details.',
  },
  {
    question: 'Who can see my scores?',
    answer:
      'Your scores are visible to you, your coach, and other members in the class leaderboard.',
  },
  {
    question: 'How do I contact support?',
    answer: 'Tap the help icon and select "Contact Support" or email us at support@gymmanager.com.',
  },
];

const FAQScreen = () => {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#D8FF3E" />
        </TouchableOpacity>
        <Text style={styles.title}>Frequently Asked Questions</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {faqs.map((faq, idx) => (
          <View key={idx} style={styles.card}>
            <Text style={styles.question}>{faq.question}</Text>
            <Text style={styles.answer}>{faq.answer}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  title: {
    color: '#D8FF3E',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 38, // To balance the back button space
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#232323',
    borderRadius: 16,
    marginBottom: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  question: {
    color: '#D8FF3E',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  answer: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
});

export default FAQScreen;
