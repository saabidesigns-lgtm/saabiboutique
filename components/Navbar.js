import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Image } from 'react-native';

export default function Navbar({ currentScreen, onNavigate, cartCount = 0, user, onLogout, storeSettings }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [menuOpen, setMenuOpen] = useState(false);

  const links = ['Home', 'About', 'Contact'];

  const goTo = (dest) => {
    setMenuOpen(false);
    onNavigate(dest);
  };

  return (
    <View>
      <View style={[styles.navbar, isMobile && styles.navbarMobile]}>
        <TouchableOpacity style={styles.brand} onPress={() => goTo('Home')}>
          <Image source={require('../assets/Logo.png')} style={[styles.logo, isMobile && styles.logoMobile]} />
          <View style={isMobile && styles.brandTextMobile}>
            <Text
              style={[styles.brandName, isMobile && styles.brandNameMobile]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {storeSettings?.brandName || 'Saabi Designes'}
            </Text>
            {!isMobile && (
              <Text style={styles.brandSub}>{storeSettings?.tagline || 'Fashion Boutique'}</Text>
            )}
          </View>
        </TouchableOpacity>
        {!isMobile && (
          <View style={styles.links}>
            {links.map((link) => (
              <TouchableOpacity key={link} onPress={() => goTo(link)} style={styles.linkWrap}>
                <Text style={[styles.link, currentScreen === link && styles.linkActive]}>
                  {link}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.rightSection}>
          {!isMobile && (
            user ? (
              <View style={styles.userBadge}>
                <Text style={styles.userName}>👤 {user.name}</Text>
                <TouchableOpacity onPress={onLogout}>
                  <Text style={styles.logoutText}>Sign out</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.loginBtn} onPress={() => goTo('Login')}>
                <Text style={styles.loginText}>👤 Login</Text>
              </TouchableOpacity>
            )
          )}
          <TouchableOpacity style={[styles.cartBtn, isMobile && styles.cartBtnMobile]} onPress={() => goTo('Bag')}>
            <Text style={[styles.cartText, isMobile && styles.cartTextMobile]}>
              {isMobile ? `🛍 ${cartCount}` : `🛍 Bag (${cartCount})`}
            </Text>
          </TouchableOpacity>
          {isMobile && (
            <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen((v) => !v)}>
              <Text style={styles.menuBtnText}>{menuOpen ? '✕' : '☰'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isMobile && menuOpen && (
        <View style={styles.mobileMenu}>
          {links.map((link) => (
            <TouchableOpacity key={link} onPress={() => goTo(link)} style={styles.mobileLinkWrap}>
              <Text style={[styles.mobileLink, currentScreen === link && styles.linkActive]}>{link}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.mobileDivider} />
          {user ? (
            <View style={styles.mobileUserRow}>
              <Text style={styles.userName}>👤 {user.name}</Text>
              <TouchableOpacity onPress={() => { setMenuOpen(false); onLogout(); }}>
                <Text style={styles.logoutText}>Sign out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.mobileLinkWrap} onPress={() => goTo('Login')}>
              <Text style={styles.mobileLink}>👤 Login</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6CC',
    shadowColor: '#C4922A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  navbarMobile: {
    paddingHorizontal: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  logo: {
    width: 300,
    height: 90,
    resizeMode: 'contain',
    marginRight: -90,
  },
  logoMobile: {
    width: 72,
    height: 48,
    marginRight: -4,
  },
  brandTextMobile: {
    flexShrink: 1,
    minWidth: 0,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C4922A',
    letterSpacing: 1,
  },
  brandNameMobile: {
    fontSize: 14,
    letterSpacing: 0,
  },
  brandSub: {
    fontSize: 11,
    color: '#999',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  links: {
    flexDirection: 'row',
    gap: 28,
  },
  linkWrap: { paddingVertical: 4 },
  link: { fontSize: 15, color: '#555', fontWeight: '500' },
  linkActive: {
    color: '#C4922A',
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: '#C4922A',
  },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userBadge: { alignItems: 'flex-end' },
  userName: { fontSize: 13, fontWeight: '700', color: '#1C1611' },
  logoutText: { fontSize: 11, color: '#C4922A', fontWeight: '600' },
  loginBtn: {
    borderWidth: 1.5,
    borderColor: '#C4922A',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
  },
  loginText: { color: '#C4922A', fontWeight: '700', fontSize: 14 },
  cartBtn: {
    backgroundColor: '#C4922A',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
  },
  cartBtnMobile: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cartText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cartTextMobile: { fontSize: 12 },
  menuBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5EDD8',
    alignItems: 'center', justifyContent: 'center',
  },
  menuBtnText: { fontSize: 18, color: '#1C1611' },
  mobileMenu: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6CC',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  mobileLinkWrap: { paddingVertical: 12 },
  mobileLink: { fontSize: 16, color: '#555', fontWeight: '600' },
  mobileDivider: { height: 1, backgroundColor: '#F0E6CC', marginVertical: 4 },
  mobileUserRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12,
  },
});
