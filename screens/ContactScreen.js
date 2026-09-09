import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { DEFAULT_PAGE_CONTENT } from '../data/pageContent';

const DEF = DEFAULT_PAGE_CONTENT.contact;

export default function ContactScreen({ content }) {
  const c = content || DEF;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>✉️</Text>
        <Text style={styles.title}>{c.heroTitle}</Text>
        <Text style={styles.subtitle}>{c.heroSubtitle}</Text>
      </View>
      <View style={styles.card}>
        <ContactForm />
      </View>
      <View style={styles.infoRow}>
        {c.info.map((item) => (
          <View key={item.label} style={styles.infoItem}>
            <Text style={styles.infoIcon}>{item.icon}</Text>
            <Text style={styles.infoLabel}>{item.label}</Text>
            <Text style={styles.infoValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ContactForm() {
  const [name,    setName]    = React.useState('');
  const [email,   setEmail]   = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sent,    setSent]    = React.useState(false);

  if (sent) {
    return (
      <View style={styles.successBox}>
        <Text style={styles.successEmoji}>👗</Text>
        <Text style={styles.successTitle}>Message Sent!</Text>
        <Text style={styles.successSub}>Our team will get back to you within 24 hours.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.formTitle}>Send us a Message</Text>
      <TextInput style={styles.input} placeholder="Your Name" value={name} onChangeText={setName} placeholderTextColor="#bbb" />
      <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor="#bbb" />
      <TextInput style={styles.input} placeholder="Subject (e.g. Order issue, Return request)" value={subject} onChangeText={setSubject} placeholderTextColor="#bbb" />
      <TextInput
        style={[styles.input, styles.textarea]}
        placeholder="How can we help you?"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        placeholderTextColor="#bbb"
      />
      <TouchableOpacity style={styles.sendBtn} onPress={() => { if (name && email && message) setSent(true); }}>
        <Text style={styles.sendText}>Send Message</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FDFAF5', flex: 1 },
  hero: { backgroundColor: '#1C1611', alignItems: 'center', paddingVertical: 52 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#C4A96A', textAlign: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: '#fff', margin: 24, borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: '#F0E6CC',
    shadowColor: '#C4922A', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    maxWidth: 560, alignSelf: 'center', width: '90%',
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#1C1611', marginBottom: 20 },
  input: {
    borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#333', marginBottom: 14, backgroundColor: '#FDFAF5',
  },
  textarea: { height: 120, textAlignVertical: 'top' },
  sendBtn: { backgroundColor: '#C4922A', paddingVertical: 14, borderRadius: 24, alignItems: 'center', marginTop: 4 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBox: { alignItems: 'center', paddingVertical: 32 },
  successEmoji: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#C4922A', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#999', textAlign: 'center' },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 16, paddingBottom: 40, gap: 12 },
  infoItem: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 20,
    minWidth: 160, flex: 1, maxWidth: 220,
    borderWidth: 1, borderColor: '#F0E6CC',
    shadowColor: '#C4922A', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  infoIcon: { fontSize: 28, marginBottom: 8 },
  infoLabel: { fontSize: 11, color: '#C4922A', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontSize: 13, color: '#555', textAlign: 'center', fontWeight: '500' },
});
