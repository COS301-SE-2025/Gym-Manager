import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, ViewStyle } from 'react-native';

export function HypeToast({ text, show, style }: { text: string; show: boolean; style?: ViewStyle }) {
  const anim = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    if (show) {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [show]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity: anim,
          transform: [{ translateY }, { scale }],
        },
        style,
      ]}
    >
      <Text style={styles.txt}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    backgroundColor: '#121812',
    borderColor: '#2a372a',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  txt: {
    color: '#D8FF3E',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
