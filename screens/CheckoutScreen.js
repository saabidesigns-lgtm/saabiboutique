import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';
import { createCodOrder, createRazorpayOrder, verifyRazorpayPayment, checkPaymentStatus } from '../utils/api';

// Razorpay's UPI flow can report payment.failed on the client (e.g. the
// widget timing out waiting for the UPI app/bank) even though the payment
// actually completes a moment later and our webhook records it as paid.
// Before treating a reported failure as final, double-check a few times.
const pollForPaidStatus = async (razorpayOrderId, { attempts = 6, intervalMs = 2500 } = {}) => {
  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      const result = await checkPaymentStatus(razorpayOrderId);
      if (result.status === 'paid') return result;
    } catch {}
  }
  return null;
};

let razorpayScriptPromise = null;
const loadRazorpayScript = () => {
  if (Platform.OS !== 'web') return Promise.reject(new Error('Online payment is only available on the web version right now.'));
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the payment widget. Check your connection and try again.'));
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
};

export default function CheckoutScreen({ cart, user, onNavigate, onOrderComplete, checkoutSettings = {}, storeSettings = {} }) {
  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [placedSummary, setPlacedSummary] = useState(null);
  const [delivery, setDelivery] = useState({ name: '', phone: '', email: '', address: '', city: '', zip: '' });
  const [payMethod, setPayMethod] = useState('razorpay'); // 'razorpay' | 'cod'
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [locSuccess, setLocSuccess] = useState(false);
  const [showAddressOptions, setShowAddressOptions] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  const isValidIndianPhone = (num) => /^[6-9]\d{9}$/.test(num);
  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handlePhoneChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setDelivery((prev) => ({ ...prev, phone: digits }));
    if (digits.length === 10 && !isValidIndianPhone(digits)) {
      setPhoneError('Enter a valid Indian mobile number (starts with 6–9)');
    } else {
      setPhoneError('');
    }
  };

  const phoneValid = isValidIndianPhone(delivery.phone);

  const handleUseLocation = async () => {
    setShowAddressOptions(false);
    setLocLoading(true);
    setLocError('');
    setLocSuccess(false);

    const fillAddress = async (lat, lon) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'SaabiDesignes/1.0',
            },
          }
        );
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const a = data.address || {};

        // Build street address — Indian addresses often use suburb/neighbourhood
        const street = [
          a.house_number,
          a.road || a.pedestrian || a.footway || a.street,
          a.neighbourhood || a.suburb,
        ].filter(Boolean).join(', ');

        // City fallback chain for India
        const city =
          a.city || a.town || a.city_district ||
          a.county || a.village || a.state_district || '';

        // Use display_name parts as last resort
        const displayParts = (data.display_name || '').split(',').map((s) => s.trim());

        setDelivery((prev) => ({
          ...prev,
          address: street || displayParts.slice(0, 3).join(', ') || prev.address,
          city: city || displayParts[displayParts.length - 3] || prev.city,
          zip: a.postcode || prev.zip,
        }));
        setLocSuccess(true);
      } catch {
        setLocError('Could not read address. Please enter address manually.');
      }
    };

    // Web: use browser geolocation directly
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await fillAddress(pos.coords.latitude, pos.coords.longitude);
          setLocLoading(false);
        },
        () => {
          setLocError('Location permission denied. Please enter address manually.');
          setLocLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      // Mobile fallback: use expo-location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocError('Location permission denied. Please enter address manually.');
          setLocLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await fillAddress(loc.coords.latitude, loc.coords.longitude);
      } catch {
        setLocError('Could not fetch location. Please enter address manually.');
      }
      setLocLoading(false);
    }
  };

  const freeThreshold = parseFloat(storeSettings.freeShippingThreshold || 999);
  const shipCost      = parseFloat(storeSettings.shippingCost || 99);
  const subtotal      = cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
  const allItemsFreeShipping = cart.length > 0 && cart.every((item) => item.freeShipping);
  const shipping      = (subtotal >= freeThreshold || allItemsFreeShipping) ? 0 : shipCost;
  const total         = (subtotal + shipping).toFixed(0);

  const enableUpi   = checkoutSettings.enableUpi  !== false;
  const enableCard  = checkoutSettings.enableCard !== false;
  const enableOnlinePay = enableUpi || enableCard;
  const enableCod   = checkoutSettings.enableCod  !== false;
  const successMsg  = checkoutSettings.successMessage || 'Your order is confirmed and will be delivered soon.';
  const headerTag   = checkoutSettings.headerTag       || '✦ SAABI DESIGNES ✦';

  const buildCheckoutPayload = () => {
    const itemsMap = {};
    cart.forEach((item) => {
      const key = `${item.name}__${item.selectedSize || ''}`;
      if (!itemsMap[key]) {
        itemsMap[key] = {
          name: item.name,
          price: parseFloat(item.price) || 0,
          qty: 0,
          size: item.selectedSize || null,
          // Snapshotted so confirmation emails can show the product as it was
          // bought, even if the product is later edited or deleted.
          image: (item.images && item.images[0]) || '',
          category: item.category || '',
        };
      }
      itemsMap[key].qty += 1;
    });
    return {
      userId: user?.id || null,
      customerName: delivery.name,
      phone: '+91' + delivery.phone,
      email: delivery.email || '',
      address: delivery.address,
      city: delivery.city,
      zip: delivery.zip,
      items: Object.values(itemsMap),
      subtotal,
      shipping,
      total: parseInt(total, 10),
    };
  };

  const handleCodOrder = async () => {
    setPlaceError('');
    setPlacing(true);
    try {
      const order = await createCodOrder(buildCheckoutPayload());
      setOrderId(order.id);
      setPlacedSummary({ items: cart, total });
      setStep(3);
      onOrderComplete();
    } catch (e) {
      setPlaceError(e.message || 'Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const handleRazorpayPay = async () => {
    setPlaceError('');
    setPlacing(true);
    try {
      await loadRazorpayScript();
      const { razorpayOrderId, keyId, amount, currency } = await createRazorpayOrder(buildCheckoutPayload());

      let resolved = false;
      const finalizeSuccess = (id) => {
        if (resolved) return;
        resolved = true;
        setPlaceError('');
        setOrderId(id);
        setPlacedSummary({ items: cart, total });
        setStep(3);
        onOrderComplete();
        setPlacing(false);
      };

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: 'Saabi Designes',
        description: 'Order Payment',
        prefill: {
          name: delivery.name,
          contact: '+91' + delivery.phone,
          email: delivery.email || undefined,
        },
        theme: { color: '#C4922A' },
        handler: async (response) => {
          try {
            const order = await verifyRazorpayPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            finalizeSuccess(order.id);
          } catch (e) {
            if (!resolved) { resolved = true; setPlaceError(e.message || 'Payment succeeded but we could not confirm your order. Please contact us with your payment ID.'); setPlacing(false); }
          }
        },
        modal: {
          // Fires when the checkout closes for any reason that isn't a normal
          // success — including Razorpay's own internal error screens, which
          // don't always trigger payment.failed. One quick check (no waiting):
          // if the webhook already confirmed payment, show success anyway;
          // otherwise this was a genuine cancel, so just go back quietly.
          ondismiss: async () => {
            if (resolved) return;
            try {
              const result = await checkPaymentStatus(razorpayOrderId);
              if (result.status === 'paid') { finalizeSuccess(result.orderId); return; }
            } catch {}
            if (!resolved) setPlacing(false);
          },
        },
      });
      rzp.on('payment.failed', async (resp) => {
        if (resolved) return;
        setPlaceError('Confirming your payment status, please wait...');
        const result = await pollForPaidStatus(razorpayOrderId);
        if (result && result.status === 'paid') {
          finalizeSuccess(result.orderId);
        } else if (!resolved) {
          resolved = true;
          setPlaceError(resp?.error?.description || 'Payment failed. Please try again.');
          setPlacing(false);
        }
      });
      rzp.open();
    } catch (e) {
      setPlaceError(e.message || 'Could not start payment. Please try again.');
      setPlacing(false);
    }
  };

  if (step === 3) {
    return (
      <View style={styles.successScreen}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Order Placed!</Text>
        {orderId ? <Text style={styles.orderIdText}>Order #{orderId}</Text> : null}
        <Text style={styles.successSub}>
          Thank you, {delivery.name || 'Customer'}! {successMsg}
        </Text>
        <View style={styles.orderBox}>
          <Text style={styles.orderBoxTitle}>Order Summary</Text>
          {(placedSummary?.items || []).map((item, i) => (
            <View key={i} style={styles.orderItem}>
              <Text style={styles.orderItemEmoji}>{item.emoji}</Text>
              <Text style={styles.orderItemName}>{item.name}</Text>
              <Text style={styles.orderItemPrice}>₹{parseInt(item.price).toLocaleString('en-IN')}</Text>
            </View>
          ))}
          <View style={styles.orderDivider} />
          <View style={styles.orderItem}>
            <Text style={[styles.orderItemName, { fontWeight: '800', color: '#1C1611' }]}>Total Paid</Text>
            <Text style={[styles.orderItemPrice, { fontWeight: '800', color: '#C4922A', fontSize: 18 }]}>₹{parseInt(placedSummary?.total || 0).toLocaleString('en-IN')}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={() => onNavigate('Home')}>
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTag}>{headerTag}</Text>
        <Text style={styles.title}>Checkout</Text>
      </View>

      {/* Steps */}
      <View style={styles.steps}>
        {['Delivery', 'Payment'].map((s, i) => (
          <View key={s} style={styles.stepRow}>
            <View style={[styles.stepCircle, step > i + 1 && styles.stepDone, step === i + 1 && styles.stepActive]}>
              <Text style={styles.stepNum}>{step > i + 1 ? '✓' : i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, step === i + 1 && styles.stepLabelActive]}>{s}</Text>
            {i < 1 && <View style={[styles.stepLine, step > 1 && styles.stepLineDone]} />}
          </View>
        ))}
      </View>

      <View style={styles.content}>
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚚 Delivery Details</Text>
            <Field label="Full Name" value={delivery.name} onChange={(v) => setDelivery({ ...delivery, name: v })} placeholder="Your full name" />
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixFlag}>🇮🇳</Text>
                  <Text style={styles.phonePrefixText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.fieldInput, styles.phoneInput, phoneError && styles.fieldInputError]}
                  value={delivery.phone}
                  onChangeText={handlePhoneChange}
                  placeholder="9XXXXXXXXX"
                  placeholderTextColor="#bbb"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {phoneError ? <Text style={styles.locError}>{phoneError}</Text> : null}
              {delivery.phone.length === 10 && phoneValid
                ? <Text style={styles.phoneSuccess}>✓ Valid mobile number</Text>
                : null}
            </View>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email (optional)</Text>
              <TextInput
                style={[styles.fieldInput, emailError && styles.fieldInputError]}
                value={delivery.email}
                onChangeText={(v) => {
                  setDelivery({ ...delivery, email: v });
                  setEmailError(v && !isValidEmail(v) ? 'Enter a valid email address' : '');
                }}
                placeholder="you@example.com"
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {emailError ? <Text style={styles.locError}>{emailError}</Text> : null}
              {!emailError && <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>We'll send your order confirmation here.</Text>}
            </View>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Address</Text>
              {/* Location picker button */}
              <TouchableOpacity
                style={[styles.locationPickerBtn, locLoading && { opacity: 0.6 }]}
                onPress={() => !locLoading && setShowAddressOptions((v) => !v)}
                disabled={locLoading}
              >
                {locLoading
                  ? <><ActivityIndicator size="small" color="#C4922A" /><Text style={styles.locationBtnText}>  Fetching your location...</Text></>
                  : locSuccess
                  ? <Text style={[styles.locationBtnText, { color: '#4CAF50' }]}>✓ Location fetched — tap to change</Text>
                  : <Text style={styles.locationBtnText}>📍 Choose location option</Text>
                }
              </TouchableOpacity>

              {/* Dropdown options */}
              {showAddressOptions && (
                <View style={styles.addressDropdown}>
                  <TouchableOpacity style={styles.addressOption} onPress={handleUseLocation}>
                    <Text style={styles.addressOptionIcon}>📍</Text>
                    <View>
                      <Text style={styles.addressOptionTitle}>Use Current Location</Text>
                      <Text style={styles.addressOptionSub}>Auto-fill from GPS</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.addressDivider} />
                  <TouchableOpacity style={styles.addressOption} onPress={() => setShowAddressOptions(false)}>
                    <Text style={styles.addressOptionIcon}>✏️</Text>
                    <View>
                      <Text style={styles.addressOptionTitle}>Enter Manually</Text>
                      <Text style={styles.addressOptionSub}>Type your street address</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Manual text input — always visible for typing */}
              {!showAddressOptions && (
                <TextInput
                  style={[styles.fieldInput, { marginTop: 6 }]}
                  value={delivery.address}
                  onChangeText={(v) => { setDelivery({ ...delivery, address: v }); setLocSuccess(false); }}
                  placeholder="Street address"
                  placeholderTextColor="#bbb"
                  autoFocus={false}
                />
              )}

              {locError ? <Text style={styles.locError}>{locError}</Text> : null}
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="City" value={delivery.city} onChange={(v) => setDelivery({ ...delivery, city: v })} placeholder="City" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="ZIP Code" value={delivery.zip} onChange={(v) => setDelivery({ ...delivery, zip: v })} placeholder="ZIP" keyboardType="numeric" />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.nextBtn, !(delivery.name && phoneValid && !emailError && delivery.address && delivery.city) && styles.nextBtnDisabled]}
              onPress={() => delivery.name && phoneValid && !emailError && delivery.address && delivery.city && setStep(2)}
            >
              <Text style={styles.nextBtnText}>Continue to Payment →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💳 Payment Method</Text>

            {/* Payment Method Selector */}
            <View style={styles.payMethods}>
              {[
                enableOnlinePay && { id: 'razorpay', label: 'Pay Online', icon: '💳', sub: 'UPI, Card, Wallet, Netbanking' },
                enableCod       && { id: 'cod',      label: 'Cash on Delivery', icon: '💵', sub: 'Pay at door' },
              ].filter(Boolean).map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payMethodCard, payMethod === m.id && styles.payMethodCardActive]}
                  onPress={() => setPayMethod(m.id)}
                >
                  <Text style={styles.payMethodIcon}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.payMethodLabel, payMethod === m.id && styles.payMethodLabelActive]}>{m.label}</Text>
                    <Text style={styles.payMethodSub}>{m.sub}</Text>
                  </View>
                  <View style={[styles.payRadio, payMethod === m.id && styles.payRadioActive]}>
                    {payMethod === m.id && <View style={styles.payRadioDot} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Online payment */}
            {payMethod === 'razorpay' && (
              <View style={styles.codBox}>
                <Text style={styles.codIcon}>💳</Text>
                <Text style={styles.codTitle}>Pay ₹{total} securely</Text>
                <Text style={styles.codSub}>Tap "Pay Now" to open the secure payment window — pay via UPI (opens your UPI app directly), card, wallet, or netbanking.</Text>
              </View>
            )}

            {/* COD */}
            {payMethod === 'cod' && (
              <View style={styles.codBox}>
                <Text style={styles.codIcon}>💵</Text>
                <Text style={styles.codTitle}>Cash on Delivery</Text>
                <Text style={styles.codSub}>Pay ₹{total} when your order arrives at your door. No advance payment needed.</Text>
              </View>
            )}

            {placeError ? <Text style={styles.locError}>{placeError}</Text> : null}

            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <Text style={styles.backBtnText}>← Back to Delivery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextBtn, placing && styles.nextBtnDisabled]}
              disabled={placing}
              onPress={payMethod === 'cod' ? handleCodOrder : handleRazorpayPay}
            >
              {placing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.nextBtnText}>
                  {payMethod === 'cod' ? '💵 Place Order · Pay on Delivery' : '🔒 Pay ₹' + total + ' Now'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          {cart.map((item, i) => (
            <View key={i} style={styles.summaryItem}>
              <Text>{item.emoji} {item.name}</Text>
              <Text style={styles.summaryPrice}>₹{parseInt(item.price).toLocaleString('en-IN')}</Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={[styles.summaryValue, shipping === 0 && { color: '#4CAF50' }]}>
              {shipping === 0 ? 'FREE' : `₹${shipCost.toLocaleString('en-IN')}`}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{parseInt(total).toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, maxLength }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FDFAF5', flex: 1 },
  header: { backgroundColor: '#1C1611', alignItems: 'center', paddingTop: 40, paddingBottom: 24 },
  headerTag: { color: '#C4922A', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff' },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6CC',
    gap: 0,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center',
  },
  stepActive: { backgroundColor: '#C4922A' },
  stepDone: { backgroundColor: '#1C1611' },
  stepNum: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepLabel: { fontSize: 13, color: '#aaa', marginHorizontal: 8, fontWeight: '500' },
  stepLabelActive: { color: '#C4922A', fontWeight: '700' },
  stepLine: { width: 40, height: 2, backgroundColor: '#eee' },
  stepLineDone: { backgroundColor: '#C4922A' },
  content: { padding: 20, maxWidth: 640, alignSelf: 'center', width: '100%', gap: 16, paddingBottom: 48 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F0E6CC',
    marginTop: 4,
    shadowColor: '#C4922A',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1C1611', marginBottom: 20 },
  row: { flexDirection: 'row' },
  fieldWrap: { marginBottom: 14 },
  addressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  locationPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FDF3E3',
    borderWidth: 1,
    borderColor: '#C4922A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  addressDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8D5A3',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#C4922A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addressOptionIcon: { fontSize: 22 },
  addressOptionTitle: { fontSize: 14, fontWeight: '700', color: '#1C1611' },
  addressOptionSub: { fontSize: 12, color: '#999', marginTop: 2 },
  addressDivider: { height: 1, backgroundColor: '#F0E6CC', marginHorizontal: 16 },
  locError: { fontSize: 12, color: '#e63946', marginTop: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phonePrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F5EDD8', borderWidth: 1, borderColor: '#E8D5A3',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
  },
  phonePrefixFlag: { fontSize: 16 },
  phonePrefixText: { fontSize: 15, fontWeight: '700', color: '#1C1611' },
  phoneInput: { flex: 1 },
  fieldInputError: { borderColor: '#e63946' },
  phoneSuccess: { fontSize: 12, color: '#4CAF50', marginTop: 4, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1 },
  fieldInput: {
    borderWidth: 1, borderColor: '#E8D5A3', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: '#333', backgroundColor: '#FDFAF5',
  },
  payMethods: { gap: 10, marginBottom: 20 },
  payMethodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#E8D5A3', borderRadius: 14,
    padding: 14, backgroundColor: '#FDFAF5',
  },
  payMethodCardActive: { borderColor: '#C4922A', backgroundColor: '#FDF3E3' },
  payMethodIcon: { fontSize: 24 },
  payMethodLabel: { fontSize: 15, fontWeight: '700', color: '#555' },
  payMethodLabelActive: { color: '#1C1611' },
  payMethodSub: { fontSize: 12, color: '#aaa', marginTop: 2 },
  payRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
  },
  payRadioActive: { borderColor: '#C4922A' },
  payRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C4922A' },
  codBox: {
    alignItems: 'center', backgroundColor: '#f5f9f0',
    borderRadius: 14, padding: 24, marginBottom: 8,
    borderWidth: 1, borderColor: '#d4edda',
  },
  codIcon: { fontSize: 40, marginBottom: 8 },
  codTitle: { fontSize: 17, fontWeight: '800', color: '#1C1611', marginBottom: 6 },
  codSub: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  nextBtn: {
    backgroundColor: '#C4922A', paddingVertical: 14,
    borderRadius: 24, alignItems: 'center', marginTop: 8,
  },
  nextBtnDisabled: { backgroundColor: '#ddd' },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn: { alignItems: 'center', marginTop: 4, marginBottom: 4 },
  backBtnText: { color: '#C4922A', fontWeight: '600', fontSize: 14 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#F0E6CC',
    shadowColor: '#C4922A', shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#1C1611', marginBottom: 14 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#777' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1C1611' },
  summaryPrice: { fontSize: 14, fontWeight: '600', color: '#C4922A' },
  summaryDivider: { height: 1, backgroundColor: '#F0E6CC', marginVertical: 10 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1C1611' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#C4922A' },
  successScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, backgroundColor: '#FDFAF5', minHeight: 600,
  },
  successIcon: { fontSize: 72, marginBottom: 16 },
  successTitle: { fontSize: 28, fontWeight: '900', color: '#1C1611', marginBottom: 10 },
  orderIdText: { fontSize: 14, fontWeight: '700', color: '#C4922A', marginBottom: 10 },
  successSub: { fontSize: 15, color: '#777', textAlign: 'center', lineHeight: 24, marginBottom: 32, maxWidth: 380 },
  orderBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%',
    maxWidth: 480, borderWidth: 1, borderColor: '#F0E6CC', marginBottom: 28,
  },
  orderBoxTitle: { fontSize: 16, fontWeight: '800', color: '#1C1611', marginBottom: 14 },
  orderItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  orderItemEmoji: { fontSize: 20 },
  orderItemName: { flex: 1, fontSize: 14, color: '#555' },
  orderItemPrice: { fontSize: 14, fontWeight: '600', color: '#C4922A' },
  orderDivider: { height: 1, backgroundColor: '#F0E6CC', marginVertical: 10 },
  doneBtn: { backgroundColor: '#C4922A', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
