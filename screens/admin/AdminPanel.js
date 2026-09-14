import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import AdminNav from '../../components/AdminNav';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './AdminProducts';
import AdminHome from './AdminHome';
import AdminPages from './AdminPages';
import AdminOrders from './AdminOrders';
import AdminCustomers from './AdminCustomers';
import AdminDiscounts from './AdminDiscounts';
import AdminAccess from './AdminAccess';
import { getCategoriesWithSubcats } from '../../utils/api';

export default function AdminPanel({ products, onProductsRefresh, homeContent, onHomeContentChange, pageContent, onPageContentChange, onAdminLogout, onGoToStore, role, adminId, onSelfRoleChange }) {
  const [section, setSection]       = useState('Dashboard');
  const canManage    = role === 'super_admin' || role === 'manager';
  const isSuperAdmin = role === 'super_admin';
  const [categories, setCategories] = useState([]);
  const [subCats, setSubCats]       = useState({});
  const [categoriesReady, setCategoriesReady] = useState(false);

  const refreshCategories = useCallback(() => {
    return getCategoriesWithSubcats().then(({ categories, subCats }) => {
      setCategories(categories);
      setSubCats(subCats);
    });
  }, []);

  useEffect(() => {
    refreshCategories().finally(() => setCategoriesReady(true));
  }, [refreshCategories]);

  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const renderSection = () => {
    switch (section) {
      case 'Dashboard': return <AdminDashboard products={products} />;
      case 'Products':
        return (
          <AdminProducts
            products={products}
            onProductsRefresh={onProductsRefresh}
            categories={categories}
            subCats={subCats}
            onCategoriesRefresh={refreshCategories}
            canManage={canManage}
          />
        );
      case 'HomeEditor':
        return <AdminHome homeContent={homeContent} onHomeContentChange={onHomeContentChange} canManage={canManage} />;
      case 'Pages':      return isSuperAdmin ? <AdminPages pageContent={pageContent} onPageContentChange={onPageContentChange} /> : <AdminDashboard products={products} />;
      case 'Orders':     return <AdminOrders canManage={canManage} />;
      case 'Customers':  return <AdminCustomers canManage={canManage} />;
      case 'Discounts':  return isSuperAdmin ? <AdminDiscounts /> : <AdminDashboard products={products} />;
      case 'Admins':     return isSuperAdmin ? <AdminAccess currentUserId={adminId} onSelfRoleChange={onSelfRoleChange} /> : <AdminDashboard products={products} />;
      default:           return <AdminDashboard products={products} />;
    }
  };

  if (!categoriesReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C4922A" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isWide && styles.containerWide]}>
      <AdminNav
        active={section}
        onSelect={setSection}
        onLogout={onAdminLogout}
        onGoToStore={onGoToStore}
        role={role}
      />
      <View style={styles.content}>
        {renderSection()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'column' },
  containerWide: { flexDirection: 'row' },
  content: { flex: 1, backgroundColor: '#F8F5F0' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5F0' },
});
