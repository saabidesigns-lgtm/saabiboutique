import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { getAdminAccounts, findUserByEmail, setAdminRole, revokeAdminAccess } from '../../utils/api';
import { notifyError } from '../../utils/notify';

const ROLES = [
  { id: 'super_admin', label: 'Super Admin', desc: 'Full access to everything' },
  { id: 'manager',     label: 'Manager',     desc: 'Products, orders & customers' },
  { id: 'staff',       label: 'Staff',       desc: 'View-only orders & customers' },
];

const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;

export default function AdminAccess({ currentUserId, onSelfRoleChange }) {
  const [admins, setAdmins]       = useState([]);
  const [loading, setLoading]     = useState(true);

  const [email, setEmail]         = useState('');
  const [searching, setSearching] = useState(false);
  const [found, setFound]         = useState(null);
  const [searchError, setSearchError] = useState('');
  const [grantRole, setGrantRole] = useState('staff');

  const loadAdmins = useCallback(() => {
    return getAdminAccounts().then(setAdmins).catch(notifyError);
  }, []);

  useEffect(() => {
    loadAdmins().finally(() => setLoading(false));
  }, [loadAdmins]);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearchError('');
    setFound(null);
    setSearching(true);
    try {
      const profile = await findUserByEmail(email);
      if (!profile) {
        setSearchError('No account found with that email — ask them to sign up on the site first.');
      } else if (profile.is_admin) {
        setSearchError('This account already has admin access — change their role in the list below.');
      } else {
        setFound(profile);
        setGrantRole('staff');
      }
    } catch (e) {
      setSearchError(e.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleGrant = async () => {
    if (!found) return;
    try {
      await setAdminRole(found.id, grantRole);
      setFound(null);
      setEmail('');
      await loadAdmins();
    } catch (e) { notifyError(e); }
  };

  const handleChangeRole = async (id, role) => {
    try {
      await setAdminRole(id, role);
      setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, role } : a));
      if (id === currentUserId) onSelfRoleChange && onSelfRoleChange();
    } catch (e) { notifyError(e); }
  };

  const handleRevoke = async (id) => {
    try {
      await revokeAdminAccess(id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } catch (e) { notifyError(e); }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C4922A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>🛡️ Admin Access</Text>
      <Text style={styles.pageSub}>Manage who can access the admin panel and what they can do</Text>

      {/* Grant access */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Grant Admin Access</Text>
        <Text style={styles.cardSub}>Find an account that already signed up on the site, then assign a role.</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={email}
            onChangeText={(v) => { setEmail(v); setSearchError(''); setFound(null); }}
            placeholder="customer@example.com"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Find</Text>}
          </TouchableOpacity>
        </View>

        {searchError ? <Text style={styles.errorText}>⚠️ {searchError}</Text> : null}

        {found && (
          <View style={styles.foundBox}>
            <Text style={styles.foundName}>{found.name || found.email}</Text>
            <Text style={styles.foundEmail}>{found.email}</Text>

            <Text style={styles.fieldLabel}>Assign Role</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.roleChip, grantRole === r.id && styles.roleChipActive]}
                  onPress={() => setGrantRole(r.id)}
                >
                  <Text style={[styles.roleChipText, grantRole === r.id && styles.roleChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.grantBtn} onPress={handleGrant}>
              <Text style={styles.grantBtnText}>Grant {roleLabel(grantRole)} Access</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Current admins */}
      <Text style={styles.sectionTitle}>Current Admins ({admins.length})</Text>
      {(() => {
        const superAdminCount = admins.filter((x) => x.role === 'super_admin').length;
        return admins.map((a) => {
          const isLastSuperAdmin = a.role === 'super_admin' && superAdminCount <= 1;
          return (
            <View key={a.id} style={styles.adminCard}>
              <View style={styles.adminInfo}>
                <Text style={styles.adminName}>{a.name}</Text>
                <Text style={styles.adminEmail}>{a.email}</Text>
                <Text style={styles.adminJoined}>Since {a.joined}</Text>
              </View>

              <View style={styles.roleRow}>
                {ROLES.map((r) => {
                  const locked = isLastSuperAdmin && r.id !== 'super_admin';
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roleChip, a.role === r.id && styles.roleChipActive, locked && styles.roleChipDisabled]}
                      disabled={locked}
                      onPress={() => handleChangeRole(a.id, r.id)}
                    >
                      <Text style={[styles.roleChipText, a.role === r.id && styles.roleChipTextActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isLastSuperAdmin && (
                <Text style={styles.lastSuperAdminNote}>
                  ⚠️ Only super admin — promote another account to super admin first to change this.
                </Text>
              )}

              {a.id !== currentUserId ? (
                <TouchableOpacity
                  style={[styles.revokeBtn, isLastSuperAdmin && styles.revokeBtnDisabled]}
                  disabled={isLastSuperAdmin}
                  onPress={() => handleRevoke(a.id)}
                >
                  <Text style={styles.revokeBtnText}>Revoke Access</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.selfNote}>This is your account</Text>
              )}
            </View>
          );
        });
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0', padding: 24 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5F0' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#1C1611', marginBottom: 4 },
  pageSub: { fontSize: 13, color: '#999', marginBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: '#F0E6CC',
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#1C1611', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#999', marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 10 },
  input: {
    borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#333', backgroundColor: '#FDFAF5',
  },
  searchBtn: {
    backgroundColor: '#C4922A', borderRadius: 12, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errorText: { fontSize: 13, color: '#e63946', marginTop: 10, fontWeight: '600' },
  foundBox: { marginTop: 16, backgroundColor: '#F8F5F0', borderRadius: 14, padding: 16 },
  foundName: { fontSize: 16, fontWeight: '800', color: '#1C1611' },
  foundEmail: { fontSize: 13, color: '#888', marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  roleChip: {
    borderWidth: 1.5, borderColor: '#E8D5A3', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff',
  },
  roleChipActive: { backgroundColor: '#1C1611', borderColor: '#1C1611' },
  roleChipDisabled: { opacity: 0.4 },
  roleChipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  roleChipTextActive: { color: '#C4922A', fontWeight: '800' },
  lastSuperAdminNote: { fontSize: 12, color: '#C4922A', fontWeight: '600', marginBottom: 12 },
  grantBtn: { backgroundColor: '#C4922A', paddingVertical: 13, borderRadius: 20, alignItems: 'center' },
  grantBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1C1611', marginBottom: 12 },
  adminCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F0E6CC',
  },
  adminInfo: { marginBottom: 12 },
  adminName: { fontSize: 15, fontWeight: '700', color: '#1C1611' },
  adminEmail: { fontSize: 13, color: '#666' },
  adminJoined: { fontSize: 11, color: '#aaa', marginTop: 2 },
  revokeBtn: { borderWidth: 1, borderColor: '#e63946', paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  revokeBtnDisabled: { opacity: 0.4 },
  revokeBtnText: { color: '#e63946', fontWeight: '700', fontSize: 13 },
  selfNote: { fontSize: 12, color: '#aaa', fontStyle: 'italic', textAlign: 'center' },
});
