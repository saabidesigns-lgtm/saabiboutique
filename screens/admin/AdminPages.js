import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch,
} from 'react-native';
import { DEFAULT_PAGE_CONTENT } from '../../data/pageContent';
import { updatePageContent } from '../../utils/api';
import { notifyError } from '../../utils/notify';

const TABS = [
  { id: 'about',    label: '📖 About' },
  { id: 'contact',  label: '✉️ Contact' },
  { id: 'store',    label: '⚙️ Store Settings' },
  { id: 'checkout', label: '💳 Checkout' },
];

export default function AdminPages({ pageContent, onPageContentChange }) {
  const [tab, setTab]   = useState('about');
  const [form, setForm] = useState({ ...pageContent });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updatePageContent(form);
      onPageContentChange(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setForm({ ...DEFAULT_PAGE_CONTENT });
    try {
      await updatePageContent(DEFAULT_PAGE_CONTENT);
      onPageContentChange(DEFAULT_PAGE_CONTENT);
    } catch (e) {
      notifyError(e);
    }
  };

  const updateAbout    = (key, val) => setForm((p) => ({ ...p, about: { ...p.about, [key]: val } }));
  const updateContact  = (key, val) => setForm((p) => ({ ...p, contact: { ...p.contact, [key]: val } }));
  const updateStore    = (key, val) => setForm((p) => ({ ...p, store: { ...p.store, [key]: val } }));
  const updateCheckout = (key, val) => setForm((p) => ({ ...p, checkout: { ...p.checkout, [key]: val } }));

  const updateSection = (i, field, val) => {
    const sections = form.about.sections.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    setForm((p) => ({ ...p, about: { ...p.about, sections } }));
  };

  const updateStat = (i, field, val) => {
    const stats = form.about.stats.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    setForm((p) => ({ ...p, about: { ...p.about, stats } }));
  };

  const updateInfo = (i, field, val) => {
    const info = form.contact.info.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
    setForm((p) => ({ ...p, contact: { ...p.contact, info } }));
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>📄 Pages Editor</Text>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Text style={styles.resetBtnText}>Reset All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnDone, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ══ ABOUT TAB ══════════════════════════════════ */}
        {tab === 'about' && (
          <View>
            {/* Hero */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 Hero Banner</Text>
              <Row label="Emoji">
                <TextInput style={[styles.input, { width: 70 }]} value={form.about.heroEmoji}
                  onChangeText={(v) => updateAbout('heroEmoji', v)} />
              </Row>
              <Row label="Title">
                <TextInput style={styles.input} value={form.about.heroTitle}
                  onChangeText={(v) => updateAbout('heroTitle', v)} placeholder="Our Story" placeholderTextColor="#bbb" />
              </Row>
              <Row label="Subtitle">
                <TextInput style={styles.input} value={form.about.heroSubtitle}
                  onChangeText={(v) => updateAbout('heroSubtitle', v)} placeholder="Tradition meets elegance" placeholderTextColor="#bbb" />
              </Row>
            </View>

            {/* Sections */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📝 Content Sections</Text>
              {form.about.sections.map((sec, i) => (
                <View key={i} style={styles.sectionBlock}>
                  <Text style={styles.sectionNum}>Section {i + 1}</Text>
                  <Row label="Heading">
                    <TextInput style={styles.input} value={sec.heading}
                      onChangeText={(v) => updateSection(i, 'heading', v)} placeholderTextColor="#bbb" />
                  </Row>
                  <Row label="Body Text">
                    <TextInput style={[styles.input, styles.tall]} value={sec.body}
                      onChangeText={(v) => updateSection(i, 'body', v)}
                      multiline placeholderTextColor="#bbb" />
                  </Row>
                </View>
              ))}
            </View>

            {/* Stats */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Stats / Numbers</Text>
              <View style={styles.statsGrid}>
                {form.about.stats.map((stat, i) => (
                  <View key={i} style={styles.statBox}>
                    <Text style={styles.label}>Value</Text>
                    <TextInput style={styles.input} value={stat.value}
                      onChangeText={(v) => updateStat(i, 'value', v)} placeholder="10K+" placeholderTextColor="#bbb" />
                    <Text style={styles.label}>Label</Text>
                    <TextInput style={styles.input} value={stat.label}
                      onChangeText={(v) => updateStat(i, 'label', v)} placeholder="Happy Customers" placeholderTextColor="#bbb" />
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ══ CONTACT TAB ════════════════════════════════ */}
        {tab === 'contact' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 Hero Banner</Text>
              <Row label="Title">
                <TextInput style={styles.input} value={form.contact.heroTitle}
                  onChangeText={(v) => updateContact('heroTitle', v)} placeholderTextColor="#bbb" />
              </Row>
              <Row label="Subtitle">
                <TextInput style={styles.input} value={form.contact.heroSubtitle}
                  onChangeText={(v) => updateContact('heroSubtitle', v)} placeholderTextColor="#bbb" />
              </Row>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 Contact Info Cards</Text>
              <Text style={styles.cardSub}>The 3 info boxes shown below the contact form</Text>
              {form.contact.info.map((item, i) => (
                <View key={i} style={styles.sectionBlock}>
                  <Text style={styles.sectionNum}>Card {i + 1}</Text>
                  <View style={styles.rowThree}>
                    <View style={{ width: 70 }}>
                      <Text style={styles.label}>Icon</Text>
                      <TextInput style={styles.input} value={item.icon}
                        onChangeText={(v) => updateInfo(i, 'icon', v)} />
                    </View>
                    <View style={{ width: 110 }}>
                      <Text style={styles.label}>Label</Text>
                      <TextInput style={styles.input} value={item.label}
                        onChangeText={(v) => updateInfo(i, 'label', v)} placeholder="Location" placeholderTextColor="#bbb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Value</Text>
                      <TextInput style={styles.input} value={item.value}
                        onChangeText={(v) => updateInfo(i, 'value', v)} placeholder="Address / Phone / Hours" placeholderTextColor="#bbb" />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══ STORE SETTINGS TAB ═════════════════════════ */}
        {tab === 'store' && (
          <View>
            {/* Brand */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏪 Brand Identity</Text>
              <Row label="Brand Name">
                <TextInput style={styles.input} value={form.store.brandName}
                  onChangeText={(v) => updateStore('brandName', v)} placeholder="Saabi Designes" placeholderTextColor="#bbb" />
              </Row>
              <Row label="Tagline (under brand name in navbar)">
                <TextInput style={styles.input} value={form.store.tagline}
                  onChangeText={(v) => updateStore('tagline', v)} placeholder="Fashion Boutique" placeholderTextColor="#bbb" />
              </Row>
            </View>

            {/* Contact Details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📞 Store Contact Details</Text>
              <Row label="Email">
                <TextInput style={styles.input} value={form.store.email}
                  onChangeText={(v) => updateStore('email', v)} placeholder="hello@saabidesignes.com"
                  keyboardType="email-address" placeholderTextColor="#bbb" />
              </Row>
              <Row label="Phone">
                <TextInput style={styles.input} value={form.store.phone}
                  onChangeText={(v) => updateStore('phone', v)} placeholder="+91 98765 43210"
                  keyboardType="phone-pad" placeholderTextColor="#bbb" />
              </Row>
              <Row label="WhatsApp Number (with country code)">
                <TextInput style={styles.input} value={form.store.whatsapp}
                  onChangeText={(v) => updateStore('whatsapp', v)} placeholder="919876543210"
                  keyboardType="phone-pad" placeholderTextColor="#bbb" />
              </Row>
              <Row label="Instagram Handle">
                <TextInput style={styles.input} value={form.store.instagram}
                  onChangeText={(v) => updateStore('instagram', v)} placeholder="@saabidesignes" placeholderTextColor="#bbb" />
              </Row>
            </View>

            {/* Shipping */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🚚 Shipping & Returns</Text>
              <Text style={styles.cardSub}>These values apply to the cart and checkout pages</Text>
              <View style={styles.rowThree}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Free Shipping Above (₹)</Text>
                  <TextInput style={styles.input} value={form.store.freeShippingThreshold}
                    onChangeText={(v) => updateStore('freeShippingThreshold', v)}
                    keyboardType="numeric" placeholder="999" placeholderTextColor="#bbb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Shipping Cost (₹)</Text>
                  <TextInput style={styles.input} value={form.store.shippingCost}
                    onChangeText={(v) => updateStore('shippingCost', v)}
                    keyboardType="numeric" placeholder="99" placeholderTextColor="#bbb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Return Window (days)</Text>
                  <TextInput style={styles.input} value={form.store.returnDays}
                    onChangeText={(v) => updateStore('returnDays', v)}
                    keyboardType="numeric" placeholder="30" placeholderTextColor="#bbb" />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ══ CHECKOUT TAB ═══════════════════════════════ */}
        {tab === 'checkout' && (
          <View>
            {/* UPI Settings */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🟣 UPI / PhonePe Settings</Text>
              <Text style={styles.cardSub}>Customers scan the QR code or enter UPI ID to pay you directly</Text>
              <Row label="Your UPI ID (VPA)">
                <TextInput
                  style={styles.input}
                  value={form.checkout.upiVpa}
                  onChangeText={(v) => updateCheckout('upiVpa', v)}
                  placeholder="yourname@ybl or yourname@paytm"
                  placeholderTextColor="#bbb"
                  autoCapitalize="none"
                />
              </Row>
              <Text style={styles.helpText}>📌 Find your UPI ID in PhonePe → Profile, or GPay → Settings</Text>
              <Row label="Merchant Name (shown on payment screen)">
                <TextInput
                  style={styles.input}
                  value={form.checkout.upiMerchantName}
                  onChangeText={(v) => updateCheckout('upiMerchantName', v)}
                  placeholder="Saabi Designes"
                  placeholderTextColor="#bbb"
                />
              </Row>
            </View>

            {/* Payment Methods */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💳 Payment Methods</Text>
              <Text style={styles.cardSub}>Choose which payment options to show at checkout</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleIcon}>🟣</Text>
                  <View>
                    <Text style={styles.toggleLabel}>UPI / PhonePe</Text>
                    <Text style={styles.toggleSub}>QR code + UPI ID entry</Text>
                  </View>
                </View>
                <Switch
                  value={form.checkout.enableUpi}
                  onValueChange={(v) => updateCheckout('enableUpi', v)}
                  trackColor={{ false: '#ddd', true: '#C4922A' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleIcon}>💳</Text>
                  <View>
                    <Text style={styles.toggleLabel}>Credit / Debit Card</Text>
                    <Text style={styles.toggleSub}>Visa, Mastercard, RuPay</Text>
                  </View>
                </View>
                <Switch
                  value={form.checkout.enableCard}
                  onValueChange={(v) => updateCheckout('enableCard', v)}
                  trackColor={{ false: '#ddd', true: '#C4922A' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleIcon}>💵</Text>
                  <View>
                    <Text style={styles.toggleLabel}>Cash on Delivery</Text>
                    <Text style={styles.toggleSub}>Pay when order arrives</Text>
                  </View>
                </View>
                <Switch
                  value={form.checkout.enableCod}
                  onValueChange={(v) => updateCheckout('enableCod', v)}
                  trackColor={{ false: '#ddd', true: '#C4922A' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Success Message */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎉 Order Success Message</Text>
              <Text style={styles.cardSub}>Shown to customers after they place an order</Text>
              <Row label="Success Message">
                <TextInput
                  style={[styles.input, styles.tall]}
                  value={form.checkout.successMessage}
                  onChangeText={(v) => updateCheckout('successMessage', v)}
                  placeholder="Your order is confirmed and will be delivered in 5–7 business days."
                  placeholderTextColor="#bbb"
                  multiline
                />
              </Row>
              <Row label="Header Tag (top of checkout page)">
                <TextInput
                  style={styles.input}
                  value={form.checkout.headerTag}
                  onChangeText={(v) => updateCheckout('headerTag', v)}
                  placeholder="✦ SAABI DESIGNES ✦"
                  placeholderTextColor="#bbb"
                />
              </Row>
            </View>
          </View>
        )}

        {/* Save at bottom */}
        <TouchableOpacity style={[styles.saveBtnLg, saved && styles.saveBtnDone, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <Text style={styles.saveBtnText}>{saved ? '✓ Changes Saved!' : saving ? 'Saving...' : 'Save All Changes'}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, children }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8F5F0' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingBottom: 12, backgroundColor: '#F8F5F0',
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1C1611' },
  topActions: { flexDirection: 'row', gap: 10 },

  resetBtn: { borderWidth: 1.5, borderColor: '#C4922A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  resetBtnText: { color: '#C4922A', fontWeight: '700', fontSize: 13 },
  saveBtn: { backgroundColor: '#C4922A', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  saveBtnDone: { backgroundColor: '#4CAF50' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  saveBtnLg: { backgroundColor: '#C4922A', marginHorizontal: 24, marginTop: 8, paddingVertical: 15, borderRadius: 24, alignItems: 'center' },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0E6CC', paddingHorizontal: 16 },
  tabBtn: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#C4922A' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  tabTextActive: { color: '#C4922A', fontWeight: '800' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, margin: 24, marginTop: 20, marginBottom: 0, padding: 20,
    shadowColor: '#C4922A', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1C1611', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#999', marginBottom: 12 },

  label: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#E8D5A3', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1C1611', backgroundColor: '#FDFAF5',
  },
  tall: { minHeight: 90, textAlignVertical: 'top' },

  sectionBlock: { borderTopWidth: 1, borderTopColor: '#F0E6CC', marginTop: 16, paddingTop: 12 },
  sectionNum: { fontSize: 12, fontWeight: '800', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1 },
  rowThree: { flexDirection: 'row', gap: 12 },

  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0E6CC',
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleIcon: { fontSize: 24, width: 32 },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: '#1C1611' },
  toggleSub: { fontSize: 12, color: '#999', marginTop: 2 },
  helpText: { fontSize: 12, color: '#C4922A', marginTop: 6, fontStyle: 'italic' },
});
