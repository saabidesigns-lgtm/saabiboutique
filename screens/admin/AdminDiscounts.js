import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Switch, ActivityIndicator } from 'react-native';
import { getDiscountCodes, createDiscountCode, updateDiscountCode, toggleDiscountActive, deleteDiscountCode } from '../../utils/api';
import { notifyError } from '../../utils/notify';

const EMPTY_FORM = { code: '', type: 'percent', value: '', minOrder: '0', maxUses: '100', expiry: '' };

export default function AdminDiscounts() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDiscountCodes().then(setCodes).catch(notifyError).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c.id); setForm({ code: c.code, type: c.type, value: c.value, minOrder: c.minOrder, maxUses: String(c.maxUses), expiry: c.expiry }); setError(''); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.code.trim()) { setError('Code is required'); return; }
    if (!form.value || isNaN(parseFloat(form.value))) { setError('Enter a valid discount value'); return; }
    if (!editing) {
      const exists = codes.find((c) => c.code.toUpperCase() === form.code.toUpperCase());
      if (exists) { setError('This code already exists'); return; }
    }
    setError('');
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateDiscountCode(editing, form);
        setCodes((prev) => prev.map((c) => c.id === editing ? updated : c));
      } else {
        const created = await createDiscountCode(form);
        setCodes((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (e) {
      setError(e.message || 'Could not save discount code.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id) => {
    const code = codes.find((c) => c.id === id);
    if (!code) return;
    try {
      await toggleDiscountActive(id, !code.active);
      setCodes((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c));
    } catch (e) { notifyError(e); }
  };

  const deleteCode = async (id) => {
    try {
      await deleteDiscountCode(id);
      setCodes((prev) => prev.filter((c) => c.id !== id));
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
      <View style={styles.topRow}>
        <View>
          <Text style={styles.pageTitle}>🎟 Discounts</Text>
          <Text style={styles.pageSub}>{codes.filter((c) => c.active).length} active codes</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ New Code</Text>
        </TouchableOpacity>
      </View>

      {codes.map((c) => {
        const usedPct = Math.min((c.uses / c.maxUses) * 100, 100);
        return (
          <View key={c.id} style={[styles.codeCard, !c.active && styles.codeCardInactive]}>
            <View style={styles.codeTop}>
              <View style={styles.codePill}>
                <Text style={styles.codeText}>{c.code}</Text>
              </View>
              <View style={styles.codeActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(c)}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteCode(c.id)}>
                  <Text style={styles.deleteIcon}>🗑</Text>
                </TouchableOpacity>
                <Switch
                  value={c.active}
                  onValueChange={() => toggleActive(c.id)}
                  trackColor={{ false: '#ddd', true: '#C4922A' }}
                  thumbColor={c.active ? '#fff' : '#fff'}
                />
              </View>
            </View>

            <View style={styles.codeDetails}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountValue}>
                  {c.type === 'percent' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                </Text>
              </View>
              {c.minOrder !== '0' && (
                <Text style={styles.codeDetail}>Min order: ₹{c.minOrder}</Text>
              )}
              <Text style={styles.codeDetail}>Expires: {c.expiry}</Text>
            </View>

            <View style={styles.usageSection}>
              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Usage</Text>
                <Text style={styles.usageCount}>{c.uses} / {c.maxUses}</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${usedPct}%`, backgroundColor: usedPct > 80 ? '#e63946' : '#C4922A' }]} />
              </View>
            </View>
          </View>
        );
      })}

      {/* Add/Edit Modal */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Code' : 'Create Discount Code'}</Text>

            <Text style={styles.fieldLabel}>Discount Code *</Text>
            <TextInput
              style={styles.fieldInput}
              value={form.code}
              onChangeText={(v) => { setForm({ ...form, code: v.toUpperCase().replace(/\s/g, '') }); setError(''); }}
              placeholder="e.g. SAABI20"
              placeholderTextColor="#bbb"
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Discount Type</Text>
            <View style={styles.typeRow}>
              {['percent', 'flat'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                  onPress={() => setForm({ ...form, type: t })}
                >
                  <Text style={[styles.typeText, form.type === t && styles.typeTextActive]}>
                    {t === 'percent' ? '% Percentage' : '₹ Flat Amount'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              {form.type === 'percent' ? 'Discount % *' : 'Flat Amount (₹) *'}
            </Text>
            <TextInput
              style={styles.fieldInput}
              value={form.value}
              onChangeText={(v) => setForm({ ...form, value: v })}
              placeholder={form.type === 'percent' ? '20' : '100'}
              placeholderTextColor="#bbb"
              keyboardType="decimal-pad"
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Min Order (₹)</Text>
                <TextInput style={styles.fieldInput} value={form.minOrder} onChangeText={(v) => setForm({ ...form, minOrder: v })} placeholder="0" placeholderTextColor="#bbb" keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Max Uses</Text>
                <TextInput style={styles.fieldInput} value={form.maxUses} onChangeText={(v) => setForm({ ...form, maxUses: v })} placeholder="100" placeholderTextColor="#bbb" keyboardType="number-pad" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Expiry Date</Text>
            <TextInput style={styles.fieldInput} value={form.expiry} onChangeText={(v) => setForm({ ...form, expiry: v })} placeholder="31 Dec 2026" placeholderTextColor="#bbb" />

            {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Code'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0', padding: 24 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5F0' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#1C1611' },
  pageSub: { fontSize: 13, color: '#999', marginTop: 2 },
  addBtn: { backgroundColor: '#C4922A', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  codeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0E6CC' },
  codeCardInactive: { opacity: 0.55 },
  codeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codePill: { backgroundColor: '#1C1611', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  codeText: { color: '#C4922A', fontWeight: '900', fontSize: 18, letterSpacing: 2 },
  codeActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { padding: 8, backgroundColor: '#F8F5F0', borderRadius: 10 },
  editIcon: { fontSize: 16 },
  deleteBtn: { padding: 8, backgroundColor: '#fff0f0', borderRadius: 10 },
  deleteIcon: { fontSize: 16 },
  codeDetails: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 },
  discountBadge: { backgroundColor: '#FDF3E3', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#F0E6CC' },
  discountValue: { fontSize: 15, fontWeight: '900', color: '#C4922A' },
  codeDetail: { fontSize: 13, color: '#888' },
  usageSection: {},
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  usageLabel: { fontSize: 12, color: '#aaa', fontWeight: '600' },
  usageCount: { fontSize: 12, fontWeight: '700', color: '#555' },
  progressBg: { height: 6, backgroundColor: '#F0E6CC', borderRadius: 4 },
  progressFill: { height: 6, borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1C1611', marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  fieldInput: { borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#FDFAF5' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E8D5A3', alignItems: 'center', backgroundColor: '#FDFAF5' },
  typeChipActive: { backgroundColor: '#C4922A', borderColor: '#C4922A' },
  typeText: { fontSize: 13, color: '#888', fontWeight: '600' },
  typeTextActive: { color: '#fff', fontWeight: '700' },
  rowInputs: { flexDirection: 'row', gap: 12 },
  errorText: { fontSize: 13, color: '#e63946', marginTop: 8, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E8D5A3', alignItems: 'center' },
  cancelText: { color: '#888', fontWeight: '700' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#C4922A', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
