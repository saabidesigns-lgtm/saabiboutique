import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { updatePassword, signOut } from '../utils/auth';

export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setError('');
    setSubmitting(true);
    try {
      await updatePassword(password);
      await signOut();
      onDone('Password updated — please sign in with your new password.');
    } catch (e) {
      setError(e.message || 'Could not update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/Logo.png')} style={styles.logo} />
        <Text style={styles.title}>Set a New Password</Text>
        <Text style={styles.sub}>Choose a new password for your account</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View> : null}

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={(v) => { setPassword(v); setError(''); }}
          placeholder="••••••••"
          placeholderTextColor="#bbb"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={(v) => { setConfirm(v); setError(''); }}
          placeholder="••••••••"
          placeholderTextColor="#bbb"
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitBtnText}>Update Password</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1611', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    width: '100%', maxWidth: 440, alignItems: 'center',
    shadowColor: '#C4922A', shadowOpacity: 0.2, shadowRadius: 20, elevation: 8,
  },
  logo: { width: 160, height: 56, resizeMode: 'contain', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#1C1611', marginBottom: 4, textAlign: 'center' },
  sub: { fontSize: 13, color: '#999', marginBottom: 24, textAlign: 'center' },
  errorBox: { backgroundColor: '#fff0f0', borderRadius: 10, padding: 10, marginBottom: 16, width: '100%' },
  errorText: { color: '#e63946', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'flex-start', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#333', backgroundColor: '#FDFAF5', width: '100%', marginBottom: 16,
  },
  submitBtn: { backgroundColor: '#C4922A', paddingVertical: 14, borderRadius: 30, alignItems: 'center', width: '100%' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
