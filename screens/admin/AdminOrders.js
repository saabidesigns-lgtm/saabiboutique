import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { getOrders, updateOrderStatus } from '../../utils/api';
import { notifyError } from '../../utils/notify';

const STATUS_FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const STATUS_COLORS = {
  Pending:    { bg: '#eee',    text: '#999',    border: '#ddd' },
  Processing: { bg: '#FDF3E3', text: '#C4922A', border: '#F0E6CC' },
  Shipped:    { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' },
  Delivered:  { bg: '#F0FFF4', text: '#4CAF50', border: '#BBF7D0' },
  Cancelled:  { bg: '#fff0f0', text: '#e63946', border: '#FCA5A5' },
};

export default function AdminOrders({ canManage = true }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selected, setSelected] = useState(null);

  const loadOrders = useCallback(() => {
    return getOrders().then(setOrders).catch(notifyError);
  }, []);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, [loadOrders]);

  const filtered = orders.filter((o) => filterStatus === 'All' || o.status === filterStatus);

  const advanceStatus = async (id) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx === -1 || idx === STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[idx + 1];
    try {
      await updateOrderStatus(id, nextStatus);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: nextStatus } : o));
      setSelected((prev) => (prev && prev.id === id) ? { ...prev, status: nextStatus } : prev);
    } catch (e) { notifyError(e); }
  };

  const cancelOrder = async (id) => {
    try {
      await updateOrderStatus(id, 'Cancelled');
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: 'Cancelled' } : o));
      setSelected(null);
    } catch (e) { notifyError(e); }
  };

  const counts = STATUS_FLOW.reduce((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C4922A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>📦 Orders</Text>
      <Text style={styles.pageSub}>{orders.length} total orders</Text>

      {/* Status Summary */}
      <View style={styles.summaryRow}>
        {STATUS_FLOW.map((s) => {
          const c = STATUS_COLORS[s];
          return (
            <View key={s} style={[styles.summaryCard, { backgroundColor: c.bg, borderColor: c.border }]}>
              <Text style={[styles.summaryCount, { color: c.text }]}>{counts[s]}</Text>
              <Text style={[styles.summaryLabel, { color: c.text }]}>{s}</Text>
            </View>
          );
        })}
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterRow}>
          {['All', ...STATUS_FLOW, 'Cancelled'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, filterStatus === s && styles.chipActive]}
              onPress={() => setFilterStatus(s)}
            >
              <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Orders */}
      {filtered.map((o) => {
        const c = STATUS_COLORS[o.status] || STATUS_COLORS.Pending;
        return (
          <TouchableOpacity key={o.id} style={styles.orderCard} onPress={() => setSelected(o)}>
            <View style={styles.orderTop}>
              <Text style={styles.orderId}>{o.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: c.bg, borderColor: c.border }]}>
                <Text style={[styles.statusText, { color: c.text }]}>{o.status}</Text>
              </View>
            </View>
            <Text style={styles.orderCustomer}>👤 {o.customer}</Text>
            <Text style={styles.orderItems}>{o.itemsLabel.join(', ')}</Text>
            <View style={styles.orderBottom}>
              <Text style={styles.orderDate}>📅 {o.date}</Text>
              <Text style={styles.orderPayment}>💳 {o.payment}</Text>
              <Text style={styles.orderTotal}>{o.totalLabel}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Order Detail Modal */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selected && (() => {
              const c = STATUS_COLORS[selected.status] || STATUS_COLORS.Pending;
              const canAdvance = STATUS_FLOW.includes(selected.status) && selected.status !== 'Delivered';
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Order {selected.id}</Text>
                    <TouchableOpacity onPress={() => setSelected(null)}>
                      <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.statusBig, { backgroundColor: c.bg, borderColor: c.border }]}>
                    <Text style={[styles.statusBigText, { color: c.text }]}>{selected.status}</Text>
                  </View>

                  {/* Progress */}
                  <View style={styles.progressRow}>
                    {STATUS_FLOW.map((s, i) => {
                      const done = STATUS_FLOW.indexOf(selected.status) >= i;
                      return (
                        <View key={s} style={styles.progressStep}>
                          <View style={[styles.progressDot, done && styles.progressDotDone]} />
                          <Text style={[styles.progressLabel, done && styles.progressLabelDone]}>{s}</Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Customer</Text>
                    <Text style={styles.detailRow}>👤 {selected.customer}</Text>
                    <Text style={styles.detailRow}>📞 {selected.phone}</Text>
                    <Text style={styles.detailRow}>📍 {selected.address}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Items</Text>
                    {selected.itemsLabel.map((item) => <Text key={item} style={styles.detailRow}>• {item}</Text>)}
                    <Text style={styles.detailTotal}>Total: {selected.totalLabel}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Payment</Text>
                    <Text style={styles.detailRow}>💳 {selected.payment}  ·  📅 {selected.date}</Text>
                  </View>

                  <View style={styles.modalActions}>
                    {canManage && canAdvance && selected.status !== 'Cancelled' && (
                      <TouchableOpacity style={styles.advanceBtn} onPress={() => advanceStatus(selected.id)}>
                        <Text style={styles.advanceBtnText}>
                          Mark as {STATUS_FLOW[STATUS_FLOW.indexOf(selected.status) + 1]} →
                        </Text>
                      </TouchableOpacity>
                    )}
                    {canManage && selected.status !== 'Cancelled' && selected.status !== 'Delivered' && (
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => cancelOrder(selected.id)}>
                        <Text style={styles.cancelBtnText}>Cancel Order</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelected(null)}>
                      <Text style={styles.closeModalText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
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
  summaryRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 },
  summaryCard: { flex: 1, minWidth: 80, borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryCount: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  summaryLabel: { fontSize: 11, fontWeight: '700' },
  filterScroll: { marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8D5A3' },
  chipActive: { backgroundColor: '#C4922A', borderColor: '#C4922A' },
  chipText: { fontSize: 13, color: '#888', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#F0E6CC',
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: '800', color: '#C4922A' },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderCustomer: { fontSize: 14, fontWeight: '700', color: '#1C1611', marginBottom: 4 },
  orderItems: { fontSize: 13, color: '#666', marginBottom: 8 },
  orderBottom: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  orderDate: { fontSize: 12, color: '#aaa' },
  orderPayment: { fontSize: 12, color: '#aaa' },
  orderTotal: { marginLeft: 'auto', fontSize: 16, fontWeight: '900', color: '#1C1611' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1C1611' },
  closeBtn: { fontSize: 20, color: '#999' },
  statusBig: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, alignItems: 'center', marginBottom: 20 },
  statusBigText: { fontSize: 16, fontWeight: '800' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  progressStep: { alignItems: 'center', flex: 1 },
  progressDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#ddd', marginBottom: 4 },
  progressDotDone: { backgroundColor: '#C4922A' },
  progressLabel: { fontSize: 10, color: '#bbb', textAlign: 'center' },
  progressLabelDone: { color: '#C4922A', fontWeight: '700' },
  detailSection: { backgroundColor: '#F8F5F0', borderRadius: 12, padding: 14, marginBottom: 12 },
  detailSectionTitle: { fontSize: 11, fontWeight: '800', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  detailRow: { fontSize: 14, color: '#444', marginBottom: 4 },
  detailTotal: { fontSize: 16, fontWeight: '900', color: '#1C1611', marginTop: 8 },
  modalActions: { gap: 10, marginTop: 8 },
  advanceBtn: { backgroundColor: '#C4922A', paddingVertical: 13, borderRadius: 20, alignItems: 'center' },
  advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { borderWidth: 1, borderColor: '#e63946', paddingVertical: 11, borderRadius: 20, alignItems: 'center' },
  cancelBtnText: { color: '#e63946', fontWeight: '700' },
  closeModalBtn: { paddingVertical: 11, borderRadius: 20, alignItems: 'center', backgroundColor: '#F0E6CC' },
  closeModalText: { color: '#888', fontWeight: '700' },
});
