import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';

export default function ProductCard({ product, onAddToCart, onProductPress }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeError, setSizeError]       = useState(false);

  const mainImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const sizes     = product.sizes && product.sizes.length > 0 ? product.sizes : [];

  const handleAddToCart = () => {
    if (product.soldOut) return;
    if (sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }
    onAddToCart({ ...product, selectedSize: selectedSize || null });
    setSelectedSize(null);
    setSizeError(false);
  };

  return (
    <View style={[styles.card, isMobile && styles.cardMobile]}>
      {/* Tappable top section → opens product detail */}
      <TouchableOpacity style={styles.tapSection} activeOpacity={0.85} onPress={() => onProductPress && onProductPress(product)}>
        <View style={[styles.imagePlaceholder, isMobile && styles.imagePlaceholderMobile, { backgroundColor: product.color || '#fdf3e3' }]}>
          {mainImage
            ? <Image source={{ uri: mainImage }} style={styles.productImage} />
            : <Text style={isMobile ? styles.emojiMobile : styles.emoji}>{product.emoji}</Text>
          }
          {product.badge ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{product.badge}</Text></View>
          ) : null}
          {product.soldOut && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutOverlayText}>Sold Out</Text>
            </View>
          )}
          {product.images && product.images.length > 1 && (
            <View style={styles.imgCount}>
              <Text style={styles.imgCountText}>📷 {product.images.length}</Text>
            </View>
          )}
          <View style={styles.viewDetail}>
            <Text style={styles.viewDetailText}>View Details</Text>
          </View>
        </View>

        <View style={[styles.nameSection, isMobile && styles.nameSectionMobile]}>
          <Text style={styles.category} numberOfLines={1}>
            {product.category}{product.subCategory ? ` · ${product.subCategory}` : ''}
          </Text>
          <Text style={[styles.name, isMobile && styles.nameMobile]} numberOfLines={1}>{product.name}</Text>
          {product.description && !isMobile ? (
            <Text style={styles.description} numberOfLines={2}>{product.description}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Non-tappable bottom section */}
      <View style={[styles.info, isMobile && styles.infoMobile]}>
        {/* Size selector */}
        {sizes.length > 0 && (
          <View style={styles.sizeSection}>
            <Text style={[styles.sizeLabel, sizeError && styles.sizeLabelError]}>
              {sizeError ? '⚠️ Select a size' : 'Size'}
            </Text>
            <View style={styles.sizesRow}>
              {sizes.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.sizeChip,
                    selectedSize === s && styles.sizeChipSelected,
                    sizeError && styles.sizeChipError,
                  ]}
                  onPress={() => { setSelectedSize(s); setSizeError(false); }}
                >
                  <Text style={[styles.sizeText, selectedSize === s && styles.sizeTextSelected]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.row, isMobile && styles.rowMobile]}>
          <View>
            {product.oldPrice ? <Text style={styles.oldPrice}>₹{product.oldPrice}</Text> : null}
            <Text style={[styles.price, isMobile && styles.priceMobile]}>₹{product.price}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, isMobile && styles.addBtnMobile, product.soldOut && styles.addBtnDisabled]}
            onPress={handleAddToCart}
            disabled={product.soldOut}
          >
            <Text style={[styles.addText, isMobile && styles.addTextMobile]} numberOfLines={1}>
              {product.soldOut ? 'Sold Out' : 'Add to Bag'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#C4922A', shadowOpacity: 0.12, shadowRadius: 12,
    elevation: 4, margin: 12, width: 260,
    flexDirection: 'column',
  },
  tapSection: { flexShrink: 0 },
  cardMobile: {
    width: '47%',
    margin: 0,
    marginBottom: 12,
  },
  imagePlaceholder: { height: 200, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  imagePlaceholderMobile: { height: 130 },
  productImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', resizeMode: 'cover' },
  emoji: { fontSize: 80 },
  emojiMobile: { fontSize: 48 },
  badge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#C4922A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  soldOutOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(28,22,17,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  soldOutOverlayText: {
    color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1,
    borderWidth: 1.5, borderColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5,
    textTransform: 'uppercase',
  },
  imgCount: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(28,22,17,0.7)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  imgCountText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  viewDetail: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(28,22,17,0.55)', paddingVertical: 7, alignItems: 'center',
  },
  viewDetailText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  nameSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  nameSectionMobile: { paddingHorizontal: 10, paddingTop: 10 },
  category: { fontSize: 11, color: '#C4922A', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1C1611', marginBottom: 4 },
  nameMobile: { fontSize: 13 },
  description: { fontSize: 12, color: '#888', lineHeight: 17, marginBottom: 4 },
  info: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  infoMobile: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 6 },
  sizeSection: { marginBottom: 10 },
  sizeLabel: { fontSize: 10, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  sizeLabelError: { color: '#e63946' },
  sizesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  sizeChip: {
    borderWidth: 1.5, borderColor: '#E8D5A3', borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 3, backgroundColor: '#FDFAF5',
  },
  sizeChipSelected: { backgroundColor: '#1C1611', borderColor: '#1C1611' },
  sizeChipError: { borderColor: '#e63946' },
  sizeText: { fontSize: 11, color: '#555', fontWeight: '600' },
  sizeTextSelected: { color: '#C4922A', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  rowMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  oldPrice: { fontSize: 12, color: '#bbb', textDecorationLine: 'line-through' },
  price: { fontSize: 18, fontWeight: '800', color: '#1C1611' },
  priceMobile: { fontSize: 15 },
  addBtn: { backgroundColor: '#C4922A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnMobile: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 9 },
  addBtnDisabled: { backgroundColor: '#ccc' },
  addText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  addTextMobile: { fontSize: 12 },
});
