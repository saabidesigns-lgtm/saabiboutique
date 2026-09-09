import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Image, Switch,
} from 'react-native';
import { DEFAULT_HOME_CONTENT } from '../../data/homeContent';
import { updateHomeContent, uploadImage } from '../../utils/api';
import { notifyError } from '../../utils/notify';

const FEATURE_ICONS = ['🚚', '🧵', '↩️', '🔒', '🎁', '⭐', '💳', '📦', '🌟', '✅', '🏷️', '🎀', '🪡', '🛍️', '🤝'];

const compressImage = (file, maxDim = 300) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / img.width, maxDim / img.height);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

// Resizes, then uploads to Supabase Storage — resolves { uri, w, h }
const uploadBanner = (file, maxDim = 1920) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / img.width, maxDim / img.height);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error('Could not process image')); return; }
          try {
            const uri = await uploadImage(blob, 'banners');
            resolve({ uri, w: canvas.width, h: canvas.height });
          } catch (err) { reject(err); }
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Could not read image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

export default function AdminHome({ homeContent, onHomeContentChange, canManage = true }) {
  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(homeContent)));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateHomeContent(form);
      onHomeContentChange(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      notifyError(e);
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateFeature = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? { ...f, [field]: value } : f),
    }));
  };

  const updateSaleBanner = (key, value) =>
    setForm((prev) => ({ ...prev, saleBanner: { ...(prev.saleBanner || {}), [key]: value } }));

  const updateCategory = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  const handleReset = async () => {
    const d = JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT));
    setForm(d);
    try {
      await updateHomeContent(d);
      onHomeContentChange(d);
    } catch (e) {
      notifyError(e);
    }
  };

  const removeFeature = (index) =>
    setForm((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));

  const addFeature = () =>
    setForm((prev) => ({ ...prev, features: [...prev.features, { image: null, text: '' }] }));

  const removeCategory = (index) =>
    setForm((prev) => ({ ...prev, categories: prev.categories.filter((_, i) => i !== index) }));

  const addCategory = () =>
    setForm((prev) => ({ ...prev, categories: [...prev.categories, { label: '', emoji: '🛍️', color: '#3D1C0A', sub: '', image: null }] }));

  const pickHeroBanner = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      setBannerUploading(true);
      try {
        const uploaded = await Promise.all(files.map((f) => uploadBanner(f)));
        setForm((prev) => {
          const current = prev.heroBanners || [];
          const slots = 5 - current.length;
          return { ...prev, heroBanners: [...current, ...uploaded.slice(0, slots)] };
        });
      } catch (e) {
        notifyError(e);
      } finally {
        setBannerUploading(false);
      }
    };
    input.click();
  };

  const pickCategoryImage = (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const compressed = await compressImage(file, 400);
      updateCategory(index, 'image', compressed);
    };
    input.click();
  };

  const pickFeatureImage = (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const compressed = await compressImage(file);
      updateFeature(index, 'image', compressed);
    };
    input.click();
  };

  return (
    <View style={styles.container}>
      {/* Sticky header — always visible */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>🏠 Home Screen Editor{!canManage ? ' · View only' : ''}</Text>
        {canManage && (
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset to Default</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnSaved, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* ── Hero Section ─────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Hero Section</Text>

        {/* ── Background Banners (top of card) ── */}
        <Text style={styles.label}>Background Banners</Text>
        <Text style={[styles.cardSub, { marginBottom: 10 }]}>Auto-slides every 4 s · landscape recommended · up to 5 images</Text>

        {(form.heroBanners || []).length > 0 && (
          <View style={styles.bannerRow}>
            {(form.heroBanners || []).map((banner, i) => {
              const uri = typeof banner === 'string' ? banner : banner.uri;
              const dim = typeof banner === 'object' && banner.w ? `${banner.w} × ${banner.h}` : null;
              return (
                <View key={i} style={styles.bannerItem}>
                  <View style={styles.bannerThumbWrap}>
                    <Image source={{ uri }} style={styles.bannerThumb} resizeMode="cover" />
                    <View style={styles.bannerNumBadge}><Text style={styles.bannerNumText}>{i + 1}</Text></View>
                    {canManage && (
                      <TouchableOpacity
                        style={styles.bannerRemove}
                        onPress={() => setForm((prev) => ({ ...prev, heroBanners: (prev.heroBanners || []).filter((_, j) => j !== i) }))}
                      >
                        <Text style={styles.featureImgRemoveText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {dim && <Text style={styles.bannerDimText}>{dim} px</Text>}
                </View>
              );
            })}
          </View>
        )}

        {canManage && (form.heroBanners || []).length < 5 && (
          <TouchableOpacity style={styles.bannerUploadZone} onPress={pickHeroBanner} disabled={bannerUploading}>
            <Text style={styles.bannerUploadIcon}>🖼️</Text>
            <Text style={styles.bannerUploadTitle}>
              {bannerUploading ? 'Uploading...' : (form.heroBanners || []).length === 0 ? 'Upload Banner Images' : 'Add More Banners'}
            </Text>
            <View style={styles.bannerSizeTag}>
              <Text style={styles.bannerSizeTagText}>Recommended: 1920 × 560 px · Landscape</Text>
            </View>
            <Text style={styles.bannerUploadSub}>
              PNG or JPG · {5 - (form.heroBanners || []).length} slot{5 - (form.heroBanners || []).length !== 1 ? 's' : ''} remaining · image will be cropped to fit
            </Text>
            <View style={styles.bannerUploadBtn}>
              <Text style={styles.bannerUploadBtnText}>{bannerUploading ? 'Uploading...' : '📁 Browse Files'}</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.heroDivider} />

        {/* ── Text fields ── */}
        <Text style={styles.label}>Tag Line (small text above title)</Text>
        <TextInput
          style={styles.input}
          value={form.heroTag}
          onChangeText={(v) => update('heroTag', v)}
          placeholder="e.g. ✦ New Festive Collection 2026 ✦"
          placeholderTextColor="#bbb"
          editable={canManage}
        />

        <Text style={styles.label}>Main Title</Text>
        <TextInput
          style={[styles.input, styles.inputTall]}
          value={form.heroTitle}
          onChangeText={(v) => update('heroTitle', v)}
          placeholder="e.g. Timeless Tradition,\nElegant Style"
          placeholderTextColor="#bbb"
          multiline
          editable={canManage}
        />

        <Text style={styles.label}>Subtitle / Description</Text>
        <TextInput
          style={[styles.input, styles.inputTall]}
          value={form.heroSub}
          onChangeText={(v) => update('heroSub', v)}
          placeholder="Short description under the title"
          placeholderTextColor="#bbb"
          multiline
          editable={canManage}
        />

        <Text style={styles.label}>Button Text</Text>
        <TextInput
          style={styles.input}
          value={form.heroBtnText}
          onChangeText={(v) => update('heroBtnText', v)}
          placeholder="e.g. 🥻  Shop Sarees"
          placeholderTextColor="#bbb"
          editable={canManage}
        />
      </View>

      {/* ── Sale Banner ──────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.featCardHeader}>
          <Text style={styles.cardTitle}>🏷️ Sale Banner</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{form.saleBanner?.enabled !== false ? 'Visible' : 'Hidden'}</Text>
            <Switch
              value={form.saleBanner?.enabled !== false}
              onValueChange={(v) => updateSaleBanner('enabled', v)}
              trackColor={{ false: '#ddd', true: '#C4922A' }}
              thumbColor="#fff"
              disabled={!canManage}
            />
          </View>
        </View>
        <Text style={styles.cardSub}>The dark promotional banner — toggle off to hide it entirely</Text>

        <Text style={styles.label}>Tag (small label at top)</Text>
        <TextInput
          style={styles.input}
          value={form.saleBanner?.tag || ''}
          onChangeText={(v) => updateSaleBanner('tag', v)}
          placeholder="e.g. LIMITED TIME OFFER"
          placeholderTextColor="#bbb"
          editable={canManage}
        />

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={[styles.input, styles.inputTall]}
          value={form.saleBanner?.title || ''}
          onChangeText={(v) => updateSaleBanner('title', v)}
          placeholder="e.g. Up to 40% Off&#10;Festive Collection"
          placeholderTextColor="#bbb"
          multiline
          editable={canManage}
        />

        <Text style={styles.label}>Sub-text / Promo Code</Text>
        <TextInput
          style={styles.input}
          value={form.saleBanner?.sub || ''}
          onChangeText={(v) => updateSaleBanner('sub', v)}
          placeholder="e.g. Use code SAABI20 at checkout"
          placeholderTextColor="#bbb"
          editable={canManage}
        />

        <Text style={styles.label}>Button Text</Text>
        <TextInput
          style={styles.input}
          value={form.saleBanner?.btnText || ''}
          onChangeText={(v) => updateSaleBanner('btnText', v)}
          placeholder="e.g. Grab the Deal"
          placeholderTextColor="#bbb"
          editable={canManage}
        />
      </View>

      {/* ── Features Strip ───────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>✦ Features Strip</Text>
        <Text style={styles.cardSub}>Trust badges shown on the home page — add, edit or remove as needed</Text>

        {form.features.map((feat, i) => (
          <View key={i} style={styles.featCard}>
            {/* Feature header */}
            <View style={styles.featCardHeader}>
              <Text style={styles.featCardNum}>Feature {i + 1}</Text>
              {canManage && (
                <TouchableOpacity style={styles.featureDelete} onPress={() => removeFeature(i)}>
                  <Text style={styles.featureDeleteText}>🗑 Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Image + Icon side by side */}
            <View style={styles.featMediaRow}>
              {/* Image upload */}
              <View style={styles.featMediaCol}>
                <Text style={styles.label}>Image (overrides icon)</Text>
                {feat.image ? (
                  <View style={styles.featureImgWrap}>
                    <Image source={{ uri: feat.image }} style={styles.featureImg} resizeMode="contain" />
                    {canManage && (
                      <TouchableOpacity style={styles.featureImgRemove} onPress={() => updateFeature(i, 'image', null)}>
                        <Text style={styles.featureImgRemoveText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : canManage ? (
                  <TouchableOpacity style={styles.featureImgUpload} onPress={() => pickFeatureImage(i)}>
                    <Text style={{ fontSize: 22 }}>🖼️</Text>
                    <Text style={styles.featureImgUploadText}>Upload Image</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.featureImgUpload}>
                    <Text style={{ fontSize: 22 }}>🖼️</Text>
                    <Text style={styles.featureImgUploadText}>No image</Text>
                  </View>
                )}
              </View>

              {/* Icon picker */}
              <View style={styles.featMediaCol}>
                <Text style={styles.label}>Icon (emoji)</Text>
                <TextInput
                  style={[styles.input, styles.iconInput]}
                  value={feat.icon || ''}
                  onChangeText={(v) => updateFeature(i, 'icon', v)}
                  placeholder="e.g. 🚚"
                  placeholderTextColor="#bbb"
                  editable={canManage}
                />
                {canManage && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    <View style={styles.iconRow}>
                      {FEATURE_ICONS.map((ic) => (
                        <TouchableOpacity
                          key={ic}
                          style={[styles.iconChip, feat.icon === ic && styles.iconChipActive]}
                          onPress={() => updateFeature(i, 'icon', ic)}
                        >
                          <Text style={styles.iconChipText}>{ic}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            </View>

            {/* Label text */}
            <Text style={styles.label}>Label Text</Text>
            <TextInput
              style={styles.input}
              value={feat.text}
              onChangeText={(v) => updateFeature(i, 'text', v)}
              placeholder="e.g. Free Delivery over ₹999"
              placeholderTextColor="#bbb"
              editable={canManage}
            />
          </View>
        ))}

        {canManage && (
          <TouchableOpacity style={styles.addFeatureBtn} onPress={addFeature}>
            <Text style={styles.addFeatureBtnText}>+ Add Feature</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Cards ───────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🗂️ Category Cards</Text>
        <Text style={styles.cardSub}>Cards in "Shop by Category" — label must match a product category name exactly</Text>
        {form.categories.map((cat, i) => (
          <View key={i} style={styles.catCard}>
            {/* Color preview strip */}
            <View style={[styles.catColorStrip, { backgroundColor: cat.color }]} />

            <View style={{ flex: 1, padding: 12, paddingLeft: 0 }}>
              {/* Card header with remove button */}
              <View style={styles.catCardHeader}>
                <Text style={styles.featCardNum}>Category {i + 1}</Text>
                {canManage && (
                  <TouchableOpacity style={styles.featureDelete} onPress={() => removeCategory(i)}>
                    <Text style={styles.featureDeleteText}>🗑 Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              {/* Top row: image + name + color */}
              <View style={styles.catFields}>
                {/* Image upload */}
                <View>
                  <Text style={styles.label}>Image</Text>
                  {cat.image ? (
                    <View style={styles.catImgWrap}>
                      <Image source={{ uri: cat.image }} style={styles.catImg} resizeMode="cover" />
                      {canManage && (
                        <TouchableOpacity style={styles.featureImgRemove} onPress={() => updateCategory(i, 'image', null)}>
                          <Text style={styles.featureImgRemoveText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : canManage ? (
                    <TouchableOpacity style={styles.catImgUpload} onPress={() => pickCategoryImage(i)}>
                      <Text style={{ fontSize: 20 }}>🖼️</Text>
                      <Text style={styles.featureImgUploadText}>Upload</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.catImgUpload}>
                      <Text style={{ fontSize: 20 }}>🖼️</Text>
                      <Text style={styles.featureImgUploadText}>No image</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.catField, { flex: 2 }]}>
                  <Text style={styles.label}>Category Name</Text>
                  <TextInput
                    style={styles.input}
                    value={cat.label}
                    onChangeText={(v) => updateCategory(i, 'label', v)}
                    placeholder="Sarees"
                    placeholderTextColor="#bbb"
                    editable={canManage}
                  />
                </View>

                <View style={[styles.catField, { flex: 1 }]}>
                  <Text style={styles.label}>Card Color</Text>
                  <TextInput
                    style={styles.input}
                    value={cat.color}
                    onChangeText={(v) => updateCategory(i, 'color', v)}
                    placeholder="#3D1C0A"
                    placeholderTextColor="#bbb"
                    editable={canManage}
                  />
                </View>
              </View>

              <Text style={styles.label}>Sub-text (shown under name)</Text>
              <TextInput
                style={styles.input}
                value={cat.sub}
                onChangeText={(v) => updateCategory(i, 'sub', v)}
                placeholder="e.g. Silk · Cotton · Georgette"
                placeholderTextColor="#bbb"
                editable={canManage}
              />
            </View>
          </View>
        ))}

        {canManage && (
          <TouchableOpacity style={styles.addFeatureBtn} onPress={addCategory}>
            <Text style={styles.addFeatureBtnText}>+ Add Category</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0' },
  scroll: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingBottom: 12,
    backgroundColor: '#F8F5F0',
    borderBottomWidth: 1, borderBottomColor: '#EDE3C8',
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1C1611' },
  topActions: { flexDirection: 'row', gap: 10 },
  resetBtn: {
    borderWidth: 1.5, borderColor: '#C4922A', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  resetBtnText: { color: '#C4922A', fontWeight: '700', fontSize: 13 },
  saveBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#C4922A',
  },
  saveBtnSaved: { backgroundColor: '#4CAF50' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, margin: 24, marginTop: 0,
    padding: 20, marginBottom: 16,
    shadowColor: '#C4922A', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1C1611', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#999', marginBottom: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 13, color: '#666', fontWeight: '600' },

  label: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#E8D5A3', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1C1611', backgroundColor: '#FDFAF5',
  },
  inputTall: { minHeight: 70, textAlignVertical: 'top' },
  inputSmall: { width: 60 },
  bannerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  bannerItem: { alignItems: 'center', gap: 4 },
  bannerThumbWrap: { width: 140, height: 82, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  bannerDimText: { fontSize: 10, color: '#888', fontWeight: '600' },
  bannerThumb: { width: '100%', height: '100%' },
  bannerRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  bannerNumBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  bannerNumText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  heroDivider: { height: 1, backgroundColor: '#EDE3C8', marginVertical: 20 },
  bannerSizeTag: { backgroundColor: '#FFF0D0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  bannerSizeTagText: { fontSize: 12, fontWeight: '700', color: '#C4922A' },
  bannerUploadZone: {
    borderWidth: 2, borderColor: '#C4922A', borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 28, alignItems: 'center', backgroundColor: '#FFFBF2', gap: 6,
  },
  bannerUploadIcon: { fontSize: 40 },
  bannerUploadTitle: { fontSize: 16, fontWeight: '800', color: '#1C1611' },
  bannerUploadSub: { fontSize: 12, color: '#999', textAlign: 'center' },
  bannerUploadBtn: { marginTop: 6, backgroundColor: '#C4922A', paddingHorizontal: 24, paddingVertical: 9, borderRadius: 20 },
  bannerUploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  featCard: {
    borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 12,
    padding: 14, marginBottom: 14, backgroundColor: '#FDFAF5',
  },
  featCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  featCardNum: { fontSize: 13, fontWeight: '800', color: '#C4922A' },
  featMediaRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  featMediaCol: { flex: 1 },

  featureImgWrap: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: '#E8D5A3', marginTop: 4, position: 'relative' },
  featureImg: { width: '100%', height: '100%' },
  featureImgRemove: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  featureImgRemoveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  featureImgUpload: {
    width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8D5A3',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', marginTop: 4, gap: 2,
  },
  featureImgUploadText: { fontSize: 10, color: '#C4922A', fontWeight: '700' },

  iconInput: { width: 70, textAlign: 'center', fontSize: 20 },
  iconRow: { flexDirection: 'row', gap: 5 },
  iconChip: {
    width: 34, height: 34, borderRadius: 8, borderWidth: 1.5, borderColor: '#E8D5A3',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  iconChipActive: { borderColor: '#C4922A', backgroundColor: '#FFF5E0' },
  iconChipText: { fontSize: 17 },

  featureDelete: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#FFF0F0',
  },
  featureDeleteText: { fontSize: 12, color: '#e63946', fontWeight: '700' },
  addFeatureBtn: {
    marginTop: 4, borderWidth: 1.5, borderColor: '#C4922A', borderStyle: 'dashed',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  addFeatureBtnText: { color: '#C4922A', fontWeight: '700', fontSize: 14 },

  catCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 12,
    overflow: 'hidden', marginBottom: 14, backgroundColor: '#FDFAF5',
  },
  catColorStrip: { width: 6, alignSelf: 'stretch' },
  catFields: { flexDirection: 'row', gap: 10, marginBottom: 0, paddingTop: 4 },
  catField: { flex: 1 },

  catImgWrap: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: '#E8D5A3', marginTop: 4, position: 'relative' },
  catImg: { width: '100%', height: '100%' },
  catCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  catImgUpload: {
    width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8D5A3',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', marginTop: 4, gap: 2,
  },
});
