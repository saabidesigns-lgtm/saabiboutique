import { View, Text, StyleSheet } from 'react-native';

export default function Logo({ size = 'md' }) {
  const isLg = size === 'lg';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, isLg && styles.badgeLg]}>
        <Text style={[styles.badgeLetter, isLg && styles.badgeLetterLg]}>S</Text>
      </View>
      <View>
        <Text style={[styles.name, isLg && styles.nameLg]}>SAABI</Text>
        <Text style={[styles.sub, isLg && styles.subLg]}>BOUTIQUE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 34,
    height: 34,
    backgroundColor: '#e63946',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLg: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  badgeLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -1,
  },
  badgeLetterLg: {
    fontSize: 28,
  },
  name: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 2,
    lineHeight: 17,
  },
  nameLg: {
    fontSize: 22,
    lineHeight: 24,
  },
  sub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#e63946',
    letterSpacing: 3,
  },
  subLg: {
    fontSize: 13,
    letterSpacing: 4,
  },
});
