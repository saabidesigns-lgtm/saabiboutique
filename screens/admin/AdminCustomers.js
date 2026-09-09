import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { getCustomers, toggleCustomerBlock } from '../../utils/api';
import { notifyError } from '../../utils/notify';

export default function AdminCustomers({ canManage = true }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getCustomers().then(setCustomers).catch(notifyError).finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleBlock = async (id) => {
    const customer = customers.find((c) => c.id === id);
    if (!customer) return;
    try {
      const status = await toggleCustomerBlock(id, customer.status === 'blocked');
      setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      setSelected((prev) => (prev && prev.id === id) ? { ...prev, status } : prev);
    } catch (e) { notifyError(e); }
  };

  const totalRevenue = customers.reduce((sum, c) => sum + parseFloat(c.spent.replace('₹', '')), 0);
  const activeCount = customers.filter((c) => c.status === 'active').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C4922A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>👥 Customers</Text>
      <Text style={styles.pageSub}>{customers.length} registered customers</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{customers.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#4CAF50' }]}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#3B82F6' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>₹{totalRevenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="🔍  Search by name, phone or email..."
        placeholderTextColor="#bbb"
      />

      {filtered.map((c) => (
        <TouchableOpacity key={c.id} style={[styles.customerCard, c.status === 'blocked' && styles.blockedCard]} onPress={() => setSelected(c)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{c.name.charAt(0)}</Text>
          </View>
          <View style={styles.customerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.customerName}>{c.name}</Text>
              {c.status === 'blocked' && <View style={styles.blockedBadge}><Text style={styles.blockedText}>Blocked</Text></View>}
            </View>
            <Text style={styles.customerPhone}>{c.phone}</Text>
            <Text style={styles.customerEmail}>{c.email}</Text>
          </View>
          <View style={styles.customerStats}>
            <Text style={styles.customerOrders}>{c.orders} orders</Text>
            <Text style={styles.customerSpent}>{c.spent}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Customer Detail Modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Customer Details</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.avatarLarge}>
                  <Text style={styles.avatarLargeText}>{selected.name.charAt(0)}</Text>
                </View>
                <Text style={styles.modalName}>{selected.name}</Text>
                <Text style={styles.modalJoined}>Member since {selected.joined}</Text>

                <View style={styles.detailGrid}>
                  {[
                    { label: 'Phone', value: selected.phone, icon: '📞' },
                    { label: 'Email', value: selected.email, icon: '📧' },
                    { label: 'Orders', value: `${selected.orders} orders`, icon: '📦' },
                    { label: 'Total Spent', value: selected.spent, icon: '💰' },
                  ].map((d) => (
                    <View key={d.label} style={styles.detailItem}>
                      <Text style={styles.detailIcon}>{d.icon}</Text>
                      <View>
                        <Text style={styles.detailLabel}>{d.label}</Text>
                        <Text style={styles.detailValue}>{d.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  {canManage && (
                    <TouchableOpacity
                      style={[styles.blockBtn, selected.status === 'blocked' && styles.unblockBtn]}
                      onPress={() => toggleBlock(selected.id)}
                    >
                      <Text style={[styles.blockBtnText, selected.status === 'blocked' && styles.unblockBtnText]}>
                        {selected.status === 'blocked' ? '✓ Unblock Customer' : '🚫 Block Customer'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.closeModalText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0', padding: 24 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5F0' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#1C1611', marginBottom: 4 },
  pageSub: { fontSize: 13, color: '#999', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FDF3E3', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#C4922A' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#C4922A', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0E6CC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#333', marginBottom: 16 },
  customerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F0E6CC' },
  blockedCard: { opacity: 0.6, borderColor: '#FCA5A5' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FDF3E3', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C4922A' },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#C4922A' },
  customerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#1C1611' },
  blockedBadge: { backgroundColor: '#fff0f0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  blockedText: { fontSize: 10, color: '#e63946', fontWeight: '700' },
  customerPhone: { fontSize: 13, color: '#666', marginBottom: 2 },
  customerEmail: { fontSize: 12, color: '#aaa' },
  customerStats: { alignItems: 'flex-end' },
  customerOrders: { fontSize: 12, color: '#888', marginBottom: 4 },
  customerSpent: { fontSize: 15, fontWeight: '800', color: '#C4922A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1C1611' },
  closeBtn: { fontSize: 20, color: '#999' },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FDF3E3', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#C4922A', alignSelf: 'center', marginBottom: 12 },
  avatarLargeText: { fontSize: 32, fontWeight: '900', color: '#C4922A' },
  modalName: { fontSize: 22, fontWeight: '900', color: '#1C1611', textAlign: 'center', marginBottom: 4 },
  modalJoined: { fontSize: 13, color: '#aaa', textAlign: 'center', marginBottom: 20 },
  detailGrid: { gap: 12, marginBottom: 20 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8F5F0', borderRadius: 12, padding: 12 },
  detailIcon: { fontSize: 22, width: 32 },
  detailLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#1C1611', marginTop: 2 },
  modalActions: { gap: 10 },
  blockBtn: { borderWidth: 1, borderColor: '#e63946', paddingVertical: 12, borderRadius: 20, alignItems: 'center' },
  blockBtnText: { color: '#e63946', fontWeight: '700', fontSize: 15 },
  unblockBtn: { borderColor: '#4CAF50', backgroundColor: '#F0FFF4' },
  unblockBtnText: { color: '#4CAF50' },
  closeModalBtn: { paddingVertical: 12, borderRadius: 20, alignItems: 'center', backgroundColor: '#F0E6CC' },
  closeModalText: { color: '#888', fontWeight: '700' },
});
