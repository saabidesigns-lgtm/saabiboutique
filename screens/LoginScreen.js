import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { signIn, signUp, signOut, getProfile, resetPasswordForEmail } from '../utils/auth';

export default function LoginScreen({ onLogin, onNavigate, successMessage, onClearSuccessMessage }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const buildUserData = (session, profile) => ({
    id: session.user.id,
    name: profile.name || session.user.email,
    email: session.user.email,
    phone: profile.phone || '',
  });

  const handleForgotPassword = async () => {
    if (!isValidEmail(email)) { setError('Enter a valid email address'); return; }
    setError('');
    setSubmitting(true);
    try {
      await resetPasswordForEmail(email.trim());
      setResetSent(true);
    } catch (e) {
      setError(e.message || 'Could not send reset email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValidEmail(email)) { setError('Enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Enter your name'); return; }

    setError('');
    setSubmitting(true);
    try {
      const data = mode === 'signup'
        ? await signUp(email.trim(), password, name.trim())
        : await signIn(email.trim(), password);

      if (!data.session) {
        // Email confirmation is required before a session exists.
        setError('Check your email to confirm your account, then sign in.');
        setMode('signin');
        return;
      }

      const profile = await getProfile(data.session.user.id);
      if (profile.is_blocked) {
        await signOut();
        setError('This account has been blocked. Contact support for help.');
        return;
      }
      onLogin(buildUserData(data.session, profile));
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../assets/Logo.png')} style={styles.logo} />
          <Text style={styles.headerTag}>✦ SAABI DESIGNES ✦</Text>
          <Text style={styles.headerTitle}>Reset Your Password</Text>
          <Text style={styles.headerSub}>We'll email you a link to set a new password</Text>
        </View>

        <View style={styles.card}>
          {resetSent ? (
            <>
              <Text style={styles.successText}>
                ✓ Check {email.trim()} for a password reset link.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => { setMode('signin'); setResetSent(false); setError(''); }}
              >
                <Text style={styles.primaryBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.primaryBtn, submitting && styles.btnDisabled]}
                onPress={handleForgotPassword}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.primaryBtnText}>Send Reset Link →</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => { setMode('signin'); setError(''); }}>
                <Text style={styles.backText}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../assets/Logo.png')} style={styles.logo} />
        <Text style={styles.headerTag}>✦ SAABI DESIGNES ✦</Text>
        <Text style={styles.headerTitle}>{mode === 'signin' ? 'Login to Continue' : 'Create Your Account'}</Text>
        <Text style={styles.headerSub}>
          {mode === 'signin' ? 'Sign in with your email and password' : 'Sign up to start shopping'}
        </Text>
      </View>

      <View style={styles.card}>
        {successMessage ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ {successMessage}</Text>
          </View>
        ) : null}

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, mode === 'signin' && styles.tabActive]} onPress={() => { setMode('signin'); setError(''); onClearSuccessMessage && onClearSuccessMessage(); }}>
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'signup' && styles.tabActive]} onPress={() => { setMode('signup'); setError(''); onClearSuccessMessage && onClearSuccessMessage(); }}>
            <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {mode === 'signup' && (
          <>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#bbb"
            />
          </>
        )}

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#bbb"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#bbb"
          secureTextEntry
          autoCapitalize="none"
        />

        {mode === 'signin' && (
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => { setMode('forgot'); setError(''); onClearSuccessMessage && onClearSuccessMessage(); }}
          >
            <Text style={styles.forgotLinkText}>Forgot password?</Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.primaryBtnText}>{mode === 'signin' ? 'Sign In →' : 'Create Account →'}</Text>
          }
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>or</Text>
          <View style={styles.divLine} />
        </View>

        <TouchableOpacity style={styles.guestBtn} onPress={() => onLogin({ name: 'Guest', phone: '', email: '' })}>
          <Text style={styles.guestText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('Home')}>
        <Text style={styles.backText}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FDFAF5', flex: 1 },
  header: {
    backgroundColor: '#1C1611',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  logo: { width: 180, height: 60, resizeMode: 'contain', marginBottom: 8 },
  headerTag: { color: '#C4922A', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 14, color: '#C4A96A', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#F0E6CC',
    shadowColor: '#C4922A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    maxWidth: 480,
    alignSelf: 'center',
    width: '90%',
  },
  tabRow: { flexDirection: 'row', backgroundColor: '#F5EDD8', borderRadius: 14, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#C4922A' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#888' },
  tabTextActive: { color: '#fff' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: 15,
    color: '#1C1611', fontWeight: '600', backgroundColor: '#FDFAF5', marginBottom: 16,
  },
  errorText: { fontSize: 12, color: '#e63946', marginBottom: 8, fontWeight: '600' },
  forgotLink: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 16 },
  forgotLinkText: { fontSize: 13, color: '#C4922A', fontWeight: '600' },
  successBox: { backgroundColor: '#eafaf0', borderRadius: 10, padding: 12, marginBottom: 16, width: '100%' },
  successText: { color: '#2a9d5c', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#C4922A', paddingVertical: 15,
    borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#ddd' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: '#F0E6CC' },
  divText: { fontSize: 13, color: '#bbb' },
  guestBtn: {
    borderWidth: 1, borderColor: '#E8D5A3',
    paddingVertical: 13, borderRadius: 30, alignItems: 'center',
  },
  guestText: { color: '#C4922A', fontWeight: '700', fontSize: 15 },
  backBtn: { alignItems: 'center', paddingVertical: 20 },
  backText: { color: '#C4922A', fontWeight: '600', fontSize: 14 },
});
