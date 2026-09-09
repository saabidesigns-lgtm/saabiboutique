import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { DEFAULT_PAGE_CONTENT } from '../data/pageContent';

const DEF = DEFAULT_PAGE_CONTENT.about;

export default function AboutScreen({ content }) {
  const c = content || DEF;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>{c.heroEmoji}</Text>
        <Text style={styles.title}>{c.heroTitle}</Text>
        <Text style={styles.subtitle}>{c.heroSubtitle}</Text>
      </View>
      <View style={styles.content}>
        {c.sections.map((sec, i) => (
          <View key={i}>
            <Text style={styles.heading}>{sec.heading}</Text>
            <Text style={styles.body}>{sec.body}</Text>
          </View>
        ))}

        <View style={styles.statsRow}>
          {c.stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FDFAF5', flex: 1 },
  hero: { backgroundColor: '#1C1611', alignItems: 'center', paddingVertical: 56 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#C4A96A' },
  content: { padding: 32, maxWidth: 720, alignSelf: 'center', width: '100%' },
  heading: { fontSize: 20, fontWeight: '700', color: '#C4922A', marginTop: 28, marginBottom: 10 },
  body: { fontSize: 15, color: '#555', lineHeight: 26 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 40,
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 28,
    borderWidth: 1, borderColor: '#F0E6CC',
    shadowColor: '#C4922A', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#C4922A' },
  statLabel: { fontSize: 13, color: '#999', marginTop: 4 },
});
