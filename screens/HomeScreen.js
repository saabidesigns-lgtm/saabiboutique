import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated, ScrollView, StyleSheet, useWindowDimensions, Image, PanResponder } from 'react-native';
import ProductCard from '../components/ProductCard';

const FILTER_EMOJI = {
  Sarees: '🥻',
  Kurtas: '👘',
  Lehengas: '💫',
  'Salwar Suits': '🧵',
};

const SORT_OPTIONS = [
  { id: 'newest',     label: 'Newest' },
  { id: 'price_low',  label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'name_az',    label: 'Name: A-Z' },
];

const PRICE_RANGES = [
  { id: 'all',        label: 'All Prices', min: 0,    max: Infinity },
  { id: '0-999',      label: 'Under ₹999', min: 0,    max: 999 },
  { id: '999-1999',   label: '₹999 – ₹1999', min: 999, max: 1999 },
  { id: '1999-2999',  label: '₹1999 – ₹2999', min: 1999, max: 2999 },
  { id: '3000+',      label: 'Above ₹3000', min: 3000, max: Infinity },
];

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const sortSizes = (sizes) => [...sizes].sort((a, b) => {
  const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
});

export default function HomeScreen({ onAddToCart, products = [], onProductPress, homeContent }) {
  const { width } = useWindowDimensions();
  const isWide  = width >= 768;
  const isSmall = width < 480;
  const hc      = homeContent || {};

  const visible = products.filter((p) => p.visible !== false);

  // Banners — support both old string format and new { uri, w, h } format
  const banners = (Array.isArray(hc.heroBanners) ? hc.heroBanners : [])
    .map((b) => (typeof b === 'string' ? { uri: b } : b))
    .filter((b) => b && b.uri);

  const [curIdx, setCurIdx]           = useState(0);
  const [displayedIdx, setDisplayedIdx] = useState(0);
  const [paused, setPaused]           = useState(false);
  const timerRef   = useRef(null);
  const fadeAnim   = useRef(new Animated.Value(1)).current;
  const isFirstRun = useRef(true);

  useEffect(() => {
    setCurIdx(0);
    setDisplayedIdx(0);
  }, [banners.length]);

  // Crossfade to the new banner whenever curIdx changes
  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; }
    Animated.timing(fadeAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
      setDisplayedIdx(curIdx);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  }, [curIdx]);

  // Auto-rotate — pauses while the hero is hovered
  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setCurIdx((i) => (i + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, [banners.length, paused]);

  const goToBanner = (i) => {
    clearInterval(timerRef.current);
    setCurIdx(((i % banners.length) + banners.length) % banners.length);
  };
  const goPrevBanner = () => goToBanner(curIdx - 1);
  const goNextBanner = () => goToBanner(curIdx + 1);

  // Swipe support — recreated each render so it never closes over a stale curIdx
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => {
      if (banners.length <= 1) return;
      if (g.dx < -40) goNextBanner();
      else if (g.dx > 40) goPrevBanner();
    },
  });

  // Hero height — follows the active banner's real aspect ratio (w/h from upload),
  // clamped so a very tall/wide image can't wreck the layout. Falls back to a fixed
  // height when there's no banner image or dimensions weren't captured.
  const FALLBACK_H = isWide ? 380 : isSmall ? 260 : 300;
  const MIN_H = isSmall ? 220 : isWide ? 280 : 240;
  const MAX_H = isWide ? 460 : isSmall ? 340 : 380;
  const activeBanner = banners[displayedIdx];
  const heroH = (activeBanner && activeBanner.w && activeBanner.h)
    ? Math.min(MAX_H, Math.max(MIN_H, Math.round(width / (activeBanner.w / activeBanner.h))))
    : FALLBACK_H;
  const heroCardMargin = isWide ? 32 : isSmall ? 12 : 20;

  const saleBanner = hc.saleBanner || {};
  const showSale   = saleBanner.enabled !== false;

  // ── Shop (merged into Home) ─────────────────
  const scrollRef = useRef(null);
  const shopY = useRef(0);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy]             = useState('newest');
  const [sortOpen, setSortOpen]         = useState(false);
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [priceRange, setPriceRange]     = useState('all');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [onSaleOnly, setOnSaleOnly]     = useState(false);

  const categories = [...new Set(visible.map((p) => p.category))];
  const dynamicFilters = [
    { label: 'All', emoji: '✨' },
    ...categories.map((c) => ({ label: c, emoji: FILTER_EMOJI[c] || '🏷️' })),
  ];

  const categoryFiltered = activeFilter === 'All'
    ? visible
    : visible.filter((p) => p.category === activeFilter);

  // Reset size selection when switching category — a size picked for one
  // category can silently zero-out results in another without this.
  useEffect(() => { setSelectedSizes([]); }, [activeFilter]);

  const availableSizes = sortSizes([...new Set(categoryFiltered.flatMap((p) => p.sizes || []))]);

  const activePriceRange = PRICE_RANGES.find((r) => r.id === priceRange) || PRICE_RANGES[0];
  const isOnSale = (p) => p.badge === 'SALE' || (p.oldPrice && parseFloat(p.oldPrice) > parseFloat(p.price));

  const filteredProducts = categoryFiltered
    .filter((p) => {
      const price = parseFloat(p.price) || 0;
      return price >= activePriceRange.min && price <= activePriceRange.max;
    })
    .filter((p) => selectedSizes.length === 0 || (p.sizes || []).some((s) => selectedSizes.includes(s)))
    .filter((p) => !onSaleOnly || isOnSale(p));

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':  return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      case 'price_high': return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      case 'name_az':    return a.name.localeCompare(b.name);
      case 'newest':
      default:           return b.id - a.id;
    }
  });

  const toggleSize = (s) => setSelectedSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  const clearFilters = () => { setPriceRange('all'); setSelectedSizes([]); setOnSaleOnly(false); };
  const activeFilterCount = (priceRange !== 'all' ? 1 : 0) + selectedSizes.length + (onSaleOnly ? 1 : 0);

  const goToShop = (category = null) => {
    setActiveFilter(category || 'All');
    scrollRef.current?.scrollTo({ y: shopY.current, animated: true });
  };

  return (
    <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Hero (card) ──────────────────────────── */}
      <View
        style={[styles.hero, { height: heroH, marginHorizontal: heroCardMargin }]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={styles.heroInner}
          onHoverIn={() => setPaused(true)}
          onHoverOut={() => setPaused(false)}
        >

          {/* Background image — crossfades between banners */}
          {banners.length > 0 && (
            <Animated.Image
              source={{ uri: activeBanner.uri }}
              style={[styles.heroBgImage, { width: '100%', height: heroH, opacity: fadeAnim }]}
              resizeMode="cover"
            />
          )}

          {/* Dark overlay */}
          <View style={[styles.heroOverlay, banners.length === 0 && { opacity: 0 }]} />

          {/* Content */}
          <Image source={require('../assets/Logo.png')} style={[styles.heroLogo, isSmall && styles.heroLogoSmall]} />
          <Text style={[styles.heroTag, isSmall && styles.heroTagSmall]}>{hc.heroTag   || '✦ New Festive Collection 2026 ✦'}</Text>
          <Text style={[styles.heroTitle, isSmall && styles.heroTitleSmall]}>{hc.heroTitle || 'Timeless Tradition,\nElegant Style'}</Text>
          <Text style={[styles.heroSub, isSmall && styles.heroSubSmall]}>{hc.heroSub   || 'Authentic sarees, kurtas & traditional wear — crafted with love.'}</Text>
          <TouchableOpacity style={[styles.heroBtn, isSmall && styles.heroBtnSmall]} onPress={() => goToShop()}>
            <Text style={[styles.heroBtnText, isSmall && styles.heroBtnTextSmall]}>{hc.heroBtnText || '🥻  Shop Sarees'}</Text>
          </TouchableOpacity>

          {/* Prev / Next arrows + dot indicators */}
          {banners.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.heroArrow, styles.heroArrowLeft]}
                onPress={goPrevBanner}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.heroArrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroArrow, styles.heroArrowRight]}
                onPress={goNextBanner}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.heroArrowText}>›</Text>
              </TouchableOpacity>

              <View style={styles.heroDots}>
                {banners.map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => goToBanner(i)}>
                    <View style={[styles.heroDot, i === curIdx && styles.heroDotActive]} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Pressable>
      </View>

      {/* ── Features Strip ───────────────────────── */}
      {(hc.features || []).length > 0 && (
        <View style={styles.featuresStrip}>
          {(hc.features || []).map((f, i) => (
            <View key={i} style={styles.featureItem}>
              {f.image
                ? <Image source={{ uri: f.image }} style={styles.featureImg} resizeMode="contain" />
                : <Text style={styles.featureIcon}>{f.icon}</Text>}
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Shop (full collection, merged) ────────── */}
      <View style={styles.section} onLayout={(e) => { shopY.current = e.nativeEvent.layout.y; }}>
        <Text style={styles.sectionLabel}>✦ SAABI DESIGNES ✦</Text>
        <Text style={styles.sectionTitle}>Shop Our Collection</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {dynamicFilters.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, activeFilter === f.label && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.label)}
            >
              <Text style={styles.filterEmoji}>{f.emoji}</Text>
              <Text style={[styles.filterText, activeFilter === f.label && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort + Filters — both are plain toggle buttons that expand the
            same kind of inline panel below, rather than one being an
            overlay dropdown and the other a panel. Keeps the two
            consistent and sidesteps any z-index/stacking fuss entirely. */}
        <View style={styles.toolbarRow}>
          <TouchableOpacity
            style={[styles.toolbarItem, styles.toolbarBtn, sortOpen && styles.toolbarBtnActive]}
            onPress={() => { setSortOpen((v) => !v); setFiltersOpen(false); }}
          >
            <Text style={[styles.toolbarBtnText, sortOpen && styles.toolbarBtnTextActive]} numberOfLines={1}>
              ⇅  Sort By  {sortOpen ? '▴' : '▾'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarItem, styles.toolbarBtn, filtersOpen && styles.toolbarBtnActive]}
            onPress={() => { setFiltersOpen((v) => !v); setSortOpen(false); }}
          >
            <Text style={[styles.toolbarBtnText, filtersOpen && styles.toolbarBtnTextActive]} numberOfLines={1}>
              ▤  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}  {filtersOpen ? '▴' : '▾'}
            </Text>
          </TouchableOpacity>
        </View>

        {sortOpen && (
          <View style={styles.filterPanel}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Sort By</Text>
              <View style={styles.filterGroupChips}>
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.miniChip, active && styles.miniChipActive]}
                      onPress={() => setSortBy(opt.id)}
                    >
                      <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {filtersOpen && (
          <View style={styles.filterPanel}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Price</Text>
              <View style={styles.filterGroupChips}>
                {PRICE_RANGES.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.miniChip, priceRange === r.id && styles.miniChipActive]}
                    onPress={() => setPriceRange(r.id)}
                  >
                    <Text style={[styles.miniChipText, priceRange === r.id && styles.miniChipTextActive]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {availableSizes.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Size</Text>
                <View style={styles.filterGroupChips}>
                  {availableSizes.map((s) => {
                    const active = selectedSizes.includes(s);
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.miniChip, active && styles.miniChipActive]}
                        onPress={() => toggleSize(s)}
                      >
                        <Text style={[styles.miniChipText, active && styles.miniChipTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Availability</Text>
              <View style={styles.filterGroupChips}>
                <TouchableOpacity
                  style={[styles.miniChip, onSaleOnly && styles.miniChipActive]}
                  onPress={() => setOnSaleOnly((v) => !v)}
                >
                  <Text style={[styles.miniChipText, onSaleOnly && styles.miniChipTextActive]}>🏷️ On Sale Only</Text>
                </TouchableOpacity>
              </View>
            </View>

            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
                <Text style={styles.clearFiltersText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.resultCount}>
          {sortedProducts.length} {activeFilter === 'All' ? 'products' : activeFilter} found
        </Text>

        <View style={[styles.grid, { justifyContent: isWide ? 'center' : 'space-between' }]}>
          {sortedProducts.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} onProductPress={onProductPress} />
          ))}
        </View>

        {sortedProducts.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyText}>
              {activeFilterCount > 0 ? 'No products match your filters.' : 'No products in this category yet.'}
            </Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters} style={{ marginTop: 12 }}>
                <Text style={styles.clearFiltersText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Occasions ────────────────────────────── */}
      <View style={[styles.section, { backgroundColor: '#fff' }]}>
        <Text style={styles.sectionLabel}>✦ SHOP BY OCCASION ✦</Text>
        <View style={styles.occasionRow}>
          {[
            { label: 'Wedding', emoji: '💍' },
            { label: 'Festival', emoji: '🪔' },
            { label: 'Party',   emoji: '🎉' },
            { label: 'Daily',   emoji: '☀️' },
          ].map((o) => (
            <TouchableOpacity key={o.label} style={styles.occasionCard} onPress={() => goToShop()}>
              <Text style={styles.occasionEmoji}>{o.emoji}</Text>
              <Text style={styles.occasionLabel}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Sale Banner ──────────────────────────── */}
      {showSale && (
        <View style={styles.saleBannerOuter}>
          <View style={styles.saleBanner}>
            {/* Corner sparkles */}
            <Text style={[styles.saleCorner, { top: 14, left: 18 }]}>✦</Text>
            <Text style={[styles.saleCorner, { top: 14, right: 18 }]}>✦</Text>
            <Text style={[styles.saleCorner, { bottom: 14, left: 18 }]}>✦</Text>
            <Text style={[styles.saleCorner, { bottom: 14, right: 18 }]}>✦</Text>

            <Text style={styles.saleTag}>{saleBanner.tag || 'LIMITED TIME OFFER'}</Text>
            <View style={styles.saleDivider} />
            <Text style={styles.saleTitle}>{saleBanner.title || 'Up to 40% Off\nFestive Collection'}</Text>

            <View style={styles.saleCodePill}>
              <Text style={styles.saleCodeText}>{saleBanner.sub || 'Use code SAABI20 at checkout'}</Text>
            </View>

            <TouchableOpacity style={styles.saleBtn} onPress={() => goToShop()}>
              <Text style={styles.saleBtnText}>{saleBanner.btnText || 'Grab the Deal'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Footer ───────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 Saabi Designes · Tradition Meets Elegance</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { backgroundColor: '#FDFAF5' },

  /* Hero (card) */
  hero: {
    backgroundColor: '#1C1611',
    marginTop: 20,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroBgImage: { position: 'absolute', top: 0, left: 0 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  heroLogo:    { width: 240, height: 90, resizeMode: 'contain', marginBottom: 8 },
  heroLogoSmall: { width: 170, height: 64, marginBottom: 4 },
  heroTag:     {
    color: '#C4922A', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 16, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  heroTagSmall: { fontSize: 9, marginBottom: 8 },
  heroTitle:   {
    fontSize: 42, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 52, marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  heroTitleSmall: { fontSize: 23, lineHeight: 30, marginBottom: 8 },
  heroSub:     {
    fontSize: 15, color: '#EAD9AE', textAlign: 'center', maxWidth: 440, lineHeight: 24, marginBottom: 36,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  heroSubSmall: { fontSize: 12, lineHeight: 17, marginBottom: 18, maxWidth: 280 },
  heroBtn:     { backgroundColor: '#C4922A', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  heroBtnSmall: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
  heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  heroBtnTextSmall: { fontSize: 12 },
  heroArrow: {
    position: 'absolute', top: '50%', marginTop: -22,
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroArrowLeft:  { left: 16 },
  heroArrowRight: { right: 16 },
  heroArrowText:  { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: -2 },
  heroDots:    { flexDirection: 'row', gap: 8, marginTop: 24 },
  heroDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  heroDotActive: { backgroundColor: '#C4922A', width: 22, borderRadius: 4 },

  /* Shared section */
  section: { padding: 28, paddingVertical: 44 },
  sectionLabel: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#C4922A', letterSpacing: 3, marginBottom: 8 },
  sectionTitle: { textAlign: 'center', fontSize: 26, fontWeight: '800', color: '#1C1611', marginBottom: 24 },

  /* Features */
  featuresStrip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0E6CC', paddingVertical: 20, paddingHorizontal: 16, gap: 4 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  featureIcon: { fontSize: 20 },
  featureImg:  { width: 28, height: 28, borderRadius: 4 },
  featureText: { fontSize: 13, fontWeight: '600', color: '#555' },

  /* Shop / filters / grid */
  filters: { paddingHorizontal: 4, paddingVertical: 4, gap: 10 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E8D5A3', backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: '#C4922A', borderColor: '#C4922A' },
  filterEmoji: { fontSize: 14 },
  filterText: { fontSize: 14, color: '#555', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  resultCount: {
    textAlign: 'center', fontSize: 13, color: '#999',
    paddingVertical: 14, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F0E6CC',
  },

  /* Sort + Filters — compact chips sized to their own content (like the
     category filter chips above them), not stretched to fill the row.
     Both expand the same kind of inline panel below (see filterPanel) —
     no overlay/dropdown, so there's no z-index stacking to fight with. */
  toolbarRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 10 },
  toolbarItem: {},
  toolbarBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E8D5A3', backgroundColor: '#fff', alignItems: 'center',
  },
  toolbarBtnActive: { backgroundColor: '#C4922A', borderColor: '#C4922A' },
  toolbarBtnText: { fontSize: 13, color: '#555', fontWeight: '600' },
  toolbarBtnTextActive: { color: '#fff' },
  filterPanel: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F0E6CC',
    padding: 18, marginTop: 14, gap: 16,
  },
  filterGroup: { gap: 10 },
  filterGroupTitle: { fontSize: 12, fontWeight: '700', color: '#C4922A', textTransform: 'uppercase', letterSpacing: 1 },
  filterGroupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniChip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 14,
    borderWidth: 1, borderColor: '#E8D5A3', backgroundColor: '#FDFAF5',
  },
  miniChipActive: { backgroundColor: '#1C1611', borderColor: '#1C1611' },
  miniChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  miniChipTextActive: { color: '#C4922A', fontWeight: '700' },
  clearFiltersBtn: { alignSelf: 'flex-start' },
  clearFiltersText: { fontSize: 13, color: '#e63946', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingTop: 12, gap: 4 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#aaa', fontWeight: '500' },

  /* Occasions */
  occasionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 20 },
  occasionCard:{ alignItems: 'center', backgroundColor: '#FDFAF5', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, borderWidth: 1, borderColor: '#F0E6CC', minWidth: 100, shadowColor: '#C4922A', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  occasionEmoji:{ fontSize: 32, marginBottom: 8 },
  occasionLabel:{ fontSize: 14, fontWeight: '700', color: '#1C1611' },

  /* Sale Banner */
  saleBannerOuter: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  saleBanner: {
    backgroundColor: '#0F0C08',
    alignItems: 'center',
    paddingVertical: 52,
    paddingHorizontal: 40,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#C4922A',
    maxWidth: 520,
    width: '100%',
    shadowColor: '#C4922A',
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  saleCorner:   { position: 'absolute', color: '#C4922A', fontSize: 15, opacity: 0.55 },
  saleTag:      { color: '#C4922A', fontSize: 11, fontWeight: '700', letterSpacing: 4, marginBottom: 16 },
  saleDivider:  { width: 44, height: 1, backgroundColor: '#C4922A', opacity: 0.45, marginBottom: 22 },
  saleTitle:    { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 42, marginBottom: 26 },
  saleCodePill: { borderWidth: 1, borderColor: '#C4922A', borderStyle: 'dashed', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8, marginBottom: 32, backgroundColor: 'rgba(196,146,42,0.08)' },
  saleCodeText: { color: '#C4A96A', fontSize: 13, fontWeight: '600' },
  saleBtn:      { backgroundColor: '#C4922A', paddingHorizontal: 42, paddingVertical: 15, borderRadius: 30 },
  saleBtnText:  { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },

  /* Footer */
  footer:    { alignItems: 'center', paddingVertical: 28, borderTopWidth: 1, borderTopColor: '#F0E6CC' },
  footerText:{ color: '#C4A96A', fontSize: 13 },
});
