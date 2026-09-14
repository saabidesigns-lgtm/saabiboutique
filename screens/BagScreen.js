import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';

export default function BagScreen({ cart, onRemove, onNavigate, storeSettings = {} }) {
  const total = cart.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2);
  const freeThreshold = parseFloat(storeSettings.freeShippingThreshold || 999);
  const shipCost = parseFloat(storeSettings.shippingCost || 99);
  const allItemsFreeShipping = cart.length > 0 && cart.every((item) => item.freeShipping);
  const shipping = (parseFloat(total) >= freeThreshold || allItemsFreeShipping) ? 0 : shipCost;

  if (cart.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🛍</Text>
        <Text style={styles.emptyTitle}>Your bag is empty</Text>
        <Text style={styles.emptySub}>Looks like you haven't added anything yet.</Text>
        <TouchableOpacity style={styles.shopBtn} onPress={() => onNavigate('Home')}>
          <Text style={styles.shopBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Bag</Text>
        <Text style={styles.subtitle}>{cart.length} item{cart.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.content}>
        {/* Items */}
        <View style={styles.itemsCard}>
          {cart.map((item, index) => {
            const mainImage = item.images && item.images.length > 0 ? item.images[0] : null;
            return (
            <View key={index} style={[styles.item, index < cart.length - 1 && styles.itemBorder]}>
              <View style={[styles.itemImage, { backgroundColor: item.color || '#fdf3e3' }]}>
                {mainImage ? (
                  <Image
                    source={{ uri: mainImage }}
                    style={styles.itemImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemCategory}>{item.category}{item.subCategory ? ` · ${item.subCategory}` : ''}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.selectedSize ? <Text style={styles.itemSize}>Size: {item.selectedSize}</Text> : null}
                <Text style={styles.itemPrice}>₹{parseInt(item.price).toLocaleString('en-IN')}</Text>
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(index)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
            );
          })}
        </View>

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{parseInt(total).toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
              {shipping === 0 ? 'FREE' : `₹${shipCost.toLocaleString('en-IN')}`}
            </Text>
          </View>
          {shipping > 0 && (
            <Text style={styles.freeShippingHint}>
              Add ₹{(freeThreshold - parseFloat(total)).toLocaleString('en-IN')} more for free shipping!
            </Text>
          )}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              ₹{(parseFloat(total) + shipping).toLocaleString('en-IN')}
            </Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => onNavigate('Checkout')}>
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueBtn} onPress={() => onNavigate('Home')}>
            <Text style={styles.continueText}>← Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FDFAF5', flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FDFAF5',
    minHeight: 500,
  },
  emptyEmoji: { fontSize: 72, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#1C1611', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#999', marginBottom: 32, textAlign: 'center' },
  shopBtn: {
    backgroundColor: '#C4922A',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  header: {
    backgroundColor: '#1C1611',
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: { fontSize: 30, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#C4A96A' },
  content: {
    padding: 20,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
    gap: 20,
  },
  itemsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E6CC',
    overflow: 'hidden',
    marginTop: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6CC',
  },
  itemImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  itemEmoji: { fontSize: 32 },
  itemInfo: { flex: 1 },
  itemCategory: { fontSize: 11, color: '#C4922A', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1C1611', marginBottom: 2 },
  itemSize: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: '#C4922A' },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fdf3e3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { fontSize: 12, color: '#C4922A', fontWeight: '700' },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0E6CC',
    padding: 20,
    marginBottom: 40,
  },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: '#1C1611', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#777' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1C1611' },
  freeShippingHint: { fontSize: 12, color: '#C4922A', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#F0E6CC', marginVertical: 12 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1C1611' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#C4922A' },
  checkoutBtn: {
    backgroundColor: '#C4922A',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  continueBtn: { alignItems: 'center', marginTop: 14 },
  continueText: { color: '#C4922A', fontWeight: '600', fontSize: 14 },
});
