import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, useWindowDimensions, Modal,
} from 'react-native';

export default function ProductDetailScreen({ product, onBack, onAddToCart }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [activeImg, setActiveImg]       = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError]       = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [added, setAdded]               = useState(false);

  const images = product.images && product.images.length > 0 ? product.images : [];
  const sizes  = product.sizes  && product.sizes.length  > 0 ? product.sizes  : [];

  const discountPct = product.oldPrice
    ? Math.round((1 - parseFloat(product.price) / parseFloat(product.oldPrice)) * 100)
    : 0;

  const handleAdd = () => {
    if (product.soldOut) return;
    if (sizes.length > 0 && !selectedSize) { setSizeError(true); return; }
    onAddToCart({ ...product, selectedSize: selectedSize || null });
    setAdded(true);
    setSizeError(false);
    setTimeout(() => setAdded(false), 2200);
  };

  /* ── Gallery section ── */
  const Gallery = () => (
    <View style={[styles.galleryCol, isWide && styles.galleryColWide]}>
      {/* Main image */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.mainImgWrap, isWide && styles.mainImgWrapWide]}
        onPress={() => images.length > 0 && setLightboxOpen(true)}
      >
        {images.length > 0 ? (
          <Image source={{ uri: images[activeImg] }} style={styles.mainImg} resizeMode="cover" />
        ) : (
          <View style={[styles.mainImg, styles.emojiBox, { backgroundColor: product.color || '#fdf3e3' }]}>
            <Text style={styles.emojiLg}>{product.emoji}</Text>
          </View>
        )}
        {images.length > 1 && (
          <View style={styles.zoomHint}>
            <Text style={styles.zoomHintText}>🔍 Tap to zoom</Text>
          </View>
        )}
        {product.badge ? (
          <View style={[styles.mainBadge, product.badge === 'SALE' ? styles.badgeSale : styles.badgeNew]}>
            <Text style={styles.mainBadgeText}>{product.badge}</Text>
          </View>
        ) : null}
        {product.soldOut && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutOverlayText}>Sold Out</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
          {images.map((img, i) => (
            <TouchableOpacity key={i} onPress={() => setActiveImg(i)} style={[styles.thumbWrap, i === activeImg && styles.thumbWrapActive]}>
              <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  /* ── Info section ── */
  const Info = () => (
    <View style={[styles.infoCol, isWide && styles.infoColWide]}>
      {/* Category */}
      <Text style={styles.catLabel}>
        {product.category}{product.subCategory ? ` › ${product.subCategory}` : ''}
      </Text>

      {/* Name */}
      <Text style={styles.productName}>{product.name}</Text>

      {/* Price row */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>₹{product.price}</Text>
        {product.oldPrice ? (
          <>
            <Text style={styles.oldPrice}>₹{product.oldPrice}</Text>
            <View style={styles.offBadge}>
              <Text style={styles.offText}>{discountPct}% OFF</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Description */}
      {product.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this product</Text>
          <Text style={styles.descText}>{product.description}</Text>
        </View>
      ) : null}

      {/* Size picker */}
      {sizes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sizeTitleRow}>
            <Text style={styles.sectionTitle}>Select Size</Text>
            {selectedSize && (
              <View style={styles.chosenBadge}>
                <Text style={styles.chosenText}>{selectedSize} ✓</Text>
              </View>
            )}
          </View>
          {sizeError && <Text style={styles.sizeErr}>Please select a size before adding to bag</Text>}
          <View style={styles.sizeGrid}>
            {sizes.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sizeChip, selectedSize === s && styles.sizeChipOn, sizeError && !selectedSize && styles.sizeChipErrBorder]}
                onPress={() => { setSelectedSize(s); setSizeError(false); }}
              >
                <Text style={[styles.sizeText, selectedSize === s && styles.sizeTextOn]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Add to Bag button */}
      <TouchableOpacity
        style={[styles.addBtn, added && styles.addBtnDone, product.soldOut && styles.addBtnDisabled]}
        onPress={handleAdd}
        activeOpacity={0.85}
        disabled={product.soldOut}
      >
        <Text style={styles.addBtnText}>
          {product.soldOut ? '🚫  Sold Out' : added ? '✓  Added to Bag!' : '🛍  Add to Bag'}
        </Text>
      </TouchableOpacity>

      {/* Shipping info */}
      <View style={styles.perksBox}>
        <Text style={styles.perksTitle}>Shipping & Delivery</Text>
        <View style={styles.perkRow}>
          <Text style={styles.perkIcon}>🚚</Text>
          <Text style={styles.perkText}>
            {product.freeShipping
              ? 'Free shipping on this product'
              : `Shipping charge: ₹${product.shippingCost || '49'}`}
          </Text>
        </View>
        <View style={styles.perkRow}>
          <Text style={styles.perkIcon}>📦</Text>
          <Text style={styles.perkText}>Estimated delivery: {product.deliveryDays || '5-7 days'}</Text>
        </View>
        <View style={styles.perkRow}>
          <Text style={styles.perkIcon}>{product.codAvailable ? '💵' : '💳'}</Text>
          <Text style={styles.perkText}>{product.codAvailable ? 'Cash on Delivery available' : 'Prepaid orders only'}</Text>
        </View>
        <View style={styles.perkDivider} />
        <View style={styles.perkRow}>
          <Text style={styles.perkIcon}>↩️</Text>
          <Text style={styles.perkText}>Easy 7-day returns</Text>
        </View>
        <View style={styles.perkRow}>
          <Text style={styles.perkIcon}>✅</Text>
          <Text style={styles.perkText}>100% authentic fabric, quality guaranteed</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Our Collection</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 100 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {isWide ? (
          /* Wide: side-by-side */
          <View style={styles.wideLayout}>
            <Gallery />
            <Info />
          </View>
        ) : (
          /* Narrow: stacked */
          <>
            <Gallery />
            <Info />
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Lightbox */}
      <Modal visible={lightboxOpen} transparent animationType="fade">
        <View style={styles.lightboxBg}>
          <TouchableOpacity style={styles.lbClose} onPress={() => setLightboxOpen(false)}>
            <Text style={styles.lbCloseText}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: images[activeImg] }} style={styles.lbImage} resizeMode="contain" />
          {images.length > 1 && (
            <View style={styles.lbNav}>
              <TouchableOpacity style={styles.lbNavBtn} onPress={() => setActiveImg((i) => Math.max(0, i - 1))}>
                <Text style={styles.lbNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.lbCounter}>{activeImg + 1} / {images.length}</Text>
              <TouchableOpacity style={styles.lbNavBtn} onPress={() => setActiveImg((i) => Math.min(images.length - 1, i + 1))}>
                <Text style={styles.lbNavText}>›</Text>
              </TouchableOpacity>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lbThumbs}>
            {images.map((img, i) => (
              <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                <Image source={{ uri: img }} style={[styles.lbThumb, i === activeImg && styles.lbThumbActive]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDFAF5' },

  /* Top bar */
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0E6CC',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 100 },
  backArrow: { fontSize: 20, color: '#C4922A', fontWeight: '700' },
  backLabel: { fontSize: 14, color: '#C4922A', fontWeight: '600' },
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#1C1611' },

  scroll: { flex: 1 },

  /* Wide layout */
  wideLayout: { flexDirection: 'row', alignItems: 'flex-start', padding: 32, gap: 40, maxWidth: 1100, alignSelf: 'center', width: '100%' },

  /* Gallery */
  galleryCol: { width: '100%' },
  galleryColWide: { flex: 1 },
  mainImgWrap: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#F8F5F0', height: 340, alignItems: 'center', justifyContent: 'center' },
  mainImgWrapWide: { height: 460 },
  mainImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  emojiBox: { alignItems: 'center', justifyContent: 'center' },
  emojiLg: { fontSize: 120 },
  zoomHint: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(28,22,17,0.6)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  zoomHintText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  mainBadge: {
    position: 'absolute', top: 14, left: 14,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  badgeSale: { backgroundColor: '#C4922A' },
  badgeNew: { backgroundColor: '#2a9d5c' },
  mainBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  thumbStrip: { flexDirection: 'row', gap: 10, paddingVertical: 14, paddingHorizontal: 4 },
  thumbWrap: { width: 70, height: 70, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbWrapActive: { borderColor: '#C4922A' },
  thumb: { width: '100%', height: '100%', resizeMode: 'cover' },

  /* Info */
  infoCol: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  infoColWide: { flex: 1, paddingHorizontal: 0, paddingTop: 0 },
  catLabel: { fontSize: 12, color: '#C4922A', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  productName: { fontSize: 28, fontWeight: '900', color: '#1C1611', lineHeight: 34, marginBottom: 16 },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  price: { fontSize: 30, fontWeight: '900', color: '#1C1611' },
  oldPrice: { fontSize: 16, color: '#bbb', textDecorationLine: 'line-through' },
  offBadge: { backgroundColor: '#D4F5E2', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  offText: { fontSize: 13, color: '#2a9d5c', fontWeight: '800' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#1C1611', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  descText: { fontSize: 15, color: '#555', lineHeight: 24 },

  sizeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  chosenBadge: { backgroundColor: '#1C1611', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chosenText: { color: '#C4922A', fontSize: 12, fontWeight: '800' },
  sizeErr: { fontSize: 13, color: '#e63946', marginBottom: 8, fontWeight: '600' },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeChip: {
    minWidth: 54, paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E8D5A3',
    backgroundColor: '#fff', alignItems: 'center',
  },
  sizeChipOn: { backgroundColor: '#1C1611', borderColor: '#1C1611' },
  sizeChipErrBorder: { borderColor: '#e63946' },
  sizeText: { fontSize: 14, color: '#777', fontWeight: '600' },
  sizeTextOn: { color: '#C4922A', fontWeight: '900' },

  addBtn: {
    backgroundColor: '#C4922A', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#C4922A', shadowOpacity: 0.35, shadowRadius: 12, elevation: 4,
  },
  addBtnDone: { backgroundColor: '#2a9d5c' },
  addBtnDisabled: { backgroundColor: '#ccc' },
  addBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },

  soldOutOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(28,22,17,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  soldOutOverlayText: {
    color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 1,
    borderWidth: 1.5, borderColor: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6,
    textTransform: 'uppercase',
  },

  perksBox: { backgroundColor: '#F8F5F0', borderRadius: 14, padding: 16, gap: 10 },
  perksTitle: { fontSize: 12, fontWeight: '800', color: '#1C1611', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  perkIcon: { fontSize: 16, width: 24 },
  perkText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 20 },
  perkDivider: { height: 1, backgroundColor: '#E8D5A3', marginVertical: 4 },

  /* Lightbox */
  lightboxBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.93)', justifyContent: 'center', alignItems: 'center' },
  lbClose: {
    position: 'absolute', top: 20, right: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, width: 42, height: 42, alignItems: 'center', justifyContent: 'center',
  },
  lbCloseText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  lbImage: { width: '88%', height: '65%', resizeMode: 'contain', alignSelf: 'center' },
  lbNav: { flexDirection: 'row', alignItems: 'center', gap: 28, marginTop: 18 },
  lbNavBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  lbNavText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  lbCounter: { color: '#fff', fontSize: 15, fontWeight: '600', minWidth: 50, textAlign: 'center' },
  lbThumbs: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  lbThumb: { width: 58, height: 58, borderRadius: 10, opacity: 0.45 },
  lbThumbActive: { opacity: 1, borderWidth: 2, borderColor: '#C4922A', borderRadius: 10 },
});
