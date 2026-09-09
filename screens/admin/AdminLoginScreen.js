import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { signIn, signOut, getProfile, resetPasswordForEmail } from '../../utils/auth';

export default function AdminLoginScreen({ onAdminLogin, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

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

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Enter your admin email and password'); return; }
    setError('');
    setSubmitting(true);
    try {
      const data = await signIn(email.trim(), password);
      const profile = await getProfile(data.session.user.id);
      if (!profile.is_admin) {
        await signOut();
        setError('This account is not authorized for admin access.');
        return;
      }
      onAdminLogin();
    } catch (e) {
      setError(e.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  if (forgotMode) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Image source={require('../../assets/Logo.png')} style={styles.logo} />
          <Text style={styles.title}>Reset Admin Password</Text>
          <Text style={styles.sub}>We'll email you a link to set a new password</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View> : null}

          {resetSent ? (
            <>
              <View style={styles.successBox}>
                <Text style={styles.successText}>✓ Check {email.trim()} for a password reset link.</Text>
              </View>
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => { setForgotMode(false); setResetSent(false); setError(''); }}
              >
                <Text style={styles.loginBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                placeholder="admin@example.com"
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TouchableOpacity style={[styles.loginBtn, submitting && { opacity: 0.6 }]} onPress={handleForgotPassword} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.loginBtnText}>Send Reset Link</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => { setForgotMode(false); setError(''); }}>
                <Text style={styles.backText}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../../assets/Logo.png')} style={styles.logo} />
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.sub}>Sign in to manage your store</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={(v) => { setEmail(v); setError(''); }}
          placeholder="admin@example.com"
          placeholderTextColor="#bbb"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            placeholder="••••••••"
            placeholderTextColor="#bbb"
            secureTextEntry={!showPass}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass((v) => !v)}>
            <Text>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotLink} onPress={() => { setForgotMode(true); setError(''); }}>
          <Text style={styles.forgotLinkText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.loginBtn, submitting && { opacity: 0.6 }]} onPress={handleLogin} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.loginBtnText}>Sign In to Admin</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('Home')}>
          <Text style={styles.backText}>← Back to Store</Text>
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
  title: { fontSize: 24, fontWeight: '900', color: '#1C1611', marginBottom: 4 },
  sub: { fontSize: 13, color: '#999', marginBottom: 24 },
  errorBox: { backgroundColor: '#fff0f0', borderRadius: 10, padding: 10, marginBottom: 16, width: '100%' },
  errorText: { color: '#e63946', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1, alignSelf: 'flex-start', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#333', backgroundColor: '#FDFAF5', width: '100%', marginBottom: 16,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16 },
  eyeBtn: { position: 'absolute', right: 14, top: 12 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 16 },
  forgotLinkText: { fontSize: 13, color: '#C4922A', fontWeight: '600' },
  successBox: { backgroundColor: '#eafaf0', borderRadius: 10, padding: 12, marginBottom: 16, width: '100%' },
  successText: { color: '#2a9d5c', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  loginBtn: { backgroundColor: '#C4922A', paddingVertical: 14, borderRadius: 30, alignItems: 'center', width: '100%', marginBottom: 12 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { paddingVertical: 8 },
  backText: { color: '#C4922A', fontWeight: '600', fontSize: 14 },
});
