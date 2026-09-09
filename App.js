import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import Navbar from './components/Navbar';
import HomeScreen from './screens/HomeScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import AboutScreen   from './screens/AboutScreen';
import ContactScreen from './screens/ContactScreen';
import BagScreen from './screens/BagScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import LoginScreen from './screens/LoginScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import AdminLoginScreen from './screens/admin/AdminLoginScreen';
import AdminPanel from './screens/admin/AdminPanel';
import { getProducts, getHomeContent, getPageContent } from './utils/api';
import { getSession, getProfile, onAuthStateChange, signOut } from './utils/auth';

const RESTORABLE = ['Home', 'About', 'Contact', 'Bag'];

// Admins reach the login form only by typing this URL directly — there is no
// link to it anywhere in the customer-facing UI. Matched case-insensitively
// so /adminlogin, /AdminLogIn etc. all work; the canonical form (used when
// the app itself writes the URL) is /AdminLogIn.
const ADMIN_LOGIN_PATH = '/adminlogin';
const ADMIN_PANEL_PATH = '/admin';

const currentPath = () => {
  try { return Platform.OS === 'web' ? window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/' : ''; }
  catch { return ''; }
};

const getInitialScreen = () => {
  if (currentPath() === ADMIN_LOGIN_PATH || currentPath() === ADMIN_PANEL_PATH) return 'AdminLogin';
  try {
    const saved = sessionStorage.getItem('saabi_screen');
    return RESTORABLE.includes(saved) ? saved : 'Home';
  } catch { return 'Home'; }
};

export default function App() {
  const [screen, setScreen]               = useState(getInitialScreen);
  const [cart, setCart]                   = useState([]);
  const [user, setUser]                   = useState(null);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [adminRole, setAdminRole]         = useState(null);
  const [adminId, setAdminId]             = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [authChecked, setAuthChecked]     = useState(false);
  const [loginMessage, setLoginMessage]   = useState('');

  // Products, home content, page content — all fetched from Supabase.
  const [products, setProducts]           = useState([]);
  const [productsReady, setProductsReady] = useState(false);
  const [homeContent, setHomeContent]     = useState(null);
  const [pageContent, setPageContent]     = useState(null);

  const refreshProducts = () => getProducts().then(setProducts);

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {}).finally(() => setProductsReady(true));
    getHomeContent().then(setHomeContent).catch(() => {});
    getPageContent().then(setPageContent).catch(() => {});
  }, []);

  // Restore/track the Supabase auth session — drives both customer login
  // and admin access, and persists across page reloads.
  useEffect(() => {
    let active = true;

    const applySession = async (session, event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (active) goTo('ResetPassword');
      }
      if (!session) {
        if (active) { setUser(null); setIsAdmin(false); setAdminRole(null); setAdminId(null); }
        return;
      }
      try {
        const profile = await getProfile(session.user.id);
        if (!active) return;
        if (profile.is_blocked) {
          await signOut();
          setUser(null);
          setIsAdmin(false);
          setAdminRole(null);
          setAdminId(null);
          return;
        }
        if (profile.is_admin) {
          setIsAdmin(true);
          setAdminRole(profile.role || 'staff');
          setAdminId(profile.id);
          setUser(null);
        } else {
          setIsAdmin(false);
          setAdminRole(null);
          setAdminId(null);
          setUser({
            id: session.user.id,
            name: profile.name || session.user.email,
            email: session.user.email,
            phone: profile.phone || '',
          });
        }
      } catch {
        if (active) { setUser(null); setIsAdmin(false); setAdminRole(null); setAdminId(null); }
      }
    };

    getSession().then(applySession).finally(() => { if (active) setAuthChecked(true); });
    const subscription = onAuthStateChange(applySession);
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  // Keep the address bar in sync with admin state on web, so the admin panel
  // only ever lives at its own URL — never reachable from a customer link.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      if (isAdmin) {
        if (window.location.pathname !== ADMIN_PANEL_PATH) window.history.replaceState({}, '', ADMIN_PANEL_PATH);
      } else if (screen === 'AdminLogin') {
        if (currentPath() !== ADMIN_LOGIN_PATH) window.history.replaceState({}, '', '/AdminLogIn');
      } else if (currentPath() === ADMIN_LOGIN_PATH || currentPath() === ADMIN_PANEL_PATH) {
        window.history.replaceState({}, '', '/');
      }
    } catch {}
  }, [isAdmin, screen]);

  const addToCart      = (item) => setCart((prev) => [...prev, item]);
  const removeFromCart = (index) => setCart((prev) => prev.filter((_, i) => i !== index));
  const clearCart      = () => setCart([]);

  const goTo = (dest) => {
    try { sessionStorage.setItem('saabi_screen', RESTORABLE.includes(dest) ? dest : 'Home'); } catch {}
    setScreen(dest);
  };

  const handleNavigate = (dest) => {
    if (dest === 'Checkout' && !user) { goTo('Login'); return; }
    setSelectedProduct(null);
    goTo(dest);
  };

  const handleProductPress = (product) => {
    setSelectedProduct(product);
    goTo('ProductDetail');
  };

  const handleLogin = (userData) => {
    setUser(userData);
    goTo(screen === 'Login' && cart.length > 0 ? 'Checkout' : 'Home');
  };

  const handleResetDone = (message) => {
    setIsAdmin(false);
    setLoginMessage(message);
    goTo('Login');
  };

  const handleLogout = async () => {
    try { await signOut(); } catch {}
    setUser(null);
    goTo('Home');
  };

  const handleAdminLogin  = () => setIsAdmin(true);
  const handleAdminLogout = async () => {
    try { await signOut(); } catch {}
    setIsAdmin(false);
    setAdminRole(null);
    setAdminId(null);
    goTo('Home');
  };
  const handleGoToStore = () => { setIsAdmin(false); setAdminRole(null); setAdminId(null); goTo('Home'); };

  if (!authChecked || !productsReady || !homeContent || !pageContent) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C4922A" />
      </View>
    );
  }

  if (screen === 'ResetPassword') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <ResetPasswordScreen onDone={handleResetDone} />
      </View>
    );
  }

  if (isAdmin) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <AdminPanel
          products={products}
          onProductsRefresh={refreshProducts}
          homeContent={homeContent}
          onHomeContentChange={setHomeContent}
          pageContent={pageContent}
          onPageContentChange={setPageContent}
          onAdminLogout={handleAdminLogout}
          onGoToStore={handleGoToStore}
          role={adminRole}
          adminId={adminId}
        />
      </View>
    );
  }

  if (screen === 'AdminLogin') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <AdminLoginScreen onAdminLogin={handleAdminLogin} onNavigate={setScreen} />
      </View>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'ProductDetail':
        return selectedProduct ? (
          <ProductDetailScreen
            product={selectedProduct}
            onBack={() => goTo('Home')}
            onAddToCart={addToCart}
          />
        ) : null;
      case 'About':    return <AboutScreen content={pageContent.about} />;
      case 'Contact':  return <ContactScreen content={pageContent.contact} storeSettings={pageContent.store} />;
      case 'Bag':      return <BagScreen cart={cart} onRemove={removeFromCart} onNavigate={handleNavigate} />;
      case 'Login':    return (
        <LoginScreen
          onLogin={handleLogin}
          onNavigate={handleNavigate}
          successMessage={loginMessage}
          onClearSuccessMessage={() => setLoginMessage('')}
        />
      );
      case 'Checkout': return <CheckoutScreen cart={cart} user={user} onNavigate={handleNavigate} onOrderComplete={clearCart} checkoutSettings={pageContent.checkout} storeSettings={pageContent.store} />;
      default:         return <HomeScreen onAddToCart={addToCart} products={products} onProductPress={handleProductPress} homeContent={homeContent} />;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Navbar
        currentScreen={screen}
        onNavigate={handleNavigate}
        cartCount={cart.length}
        user={user}
        onLogout={handleLogout}
        storeSettings={pageContent.store}
      />
      <View style={styles.content}>{renderScreen()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDFAF5' },
  content: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDFAF5' },
});
