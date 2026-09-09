import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  staff: 'Staff',
};

const NAV_ITEMS = [
  { id: 'Dashboard',  icon: '📊', label: 'Dashboard',   roles: ['super_admin', 'manager', 'staff'] },
  { id: 'Products',   icon: '👗', label: 'Products',    roles: ['super_admin', 'manager', 'staff'] },
  { id: 'HomeEditor', icon: '🏠', label: 'Home Screen',  roles: ['super_admin', 'manager', 'staff'] },
  { id: 'Pages',      icon: '📄', label: 'Pages',       roles: ['super_admin'] },
  { id: 'Orders',     icon: '📦', label: 'Orders',      roles: ['super_admin', 'manager', 'staff'] },
  { id: 'Customers',  icon: '👥', label: 'Customers',   roles: ['super_admin', 'manager', 'staff'] },
  { id: 'Discounts',  icon: '🎟', label: 'Discounts',   roles: ['super_admin'] },
  { id: 'Admins',     icon: '🛡️', label: 'Admins',       roles: ['super_admin'] },
];

export default function AdminNav({ active, onSelect, onLogout, onGoToStore, role }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <View style={styles.nav}>
      <Text style={styles.navTitle}>⚙️ Admin</Text>
      <Text style={styles.navSub}>{ROLE_LABELS[role] || 'Saabi Designes'}</Text>
      <View style={styles.divider} />

      {/* Scrollable nav items */}
      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, active === item.id && styles.navItemActive]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={styles.navIcon}>{item.icon}</Text>
            <Text style={[styles.navLabel, active === item.id && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Fixed bottom actions */}
      <View style={styles.divider} />
      <TouchableOpacity style={styles.navItem} onPress={onGoToStore}>
        <Text style={styles.navIcon}>🏪</Text>
        <Text style={styles.navLabel}>View Store</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onLogout}>
        <Text style={styles.navIcon}>🚪</Text>
        <Text style={[styles.navLabel, { color: '#e63946' }]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    width: 200,
    backgroundColor: '#1C1611',
    paddingVertical: 24,
    paddingHorizontal: 12,
    minHeight: '100%',
  },
  navTitle: { fontSize: 18, fontWeight: '900', color: '#C4922A', textAlign: 'center' },
  navSub: { fontSize: 11, color: '#666', textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#2d2520', marginVertical: 8 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2,
  },
  navItemActive: { backgroundColor: '#C4922A20', borderLeftWidth: 3, borderLeftColor: '#C4922A' },
  navIcon: { fontSize: 18, width: 24 },
  navLabel: { fontSize: 14, color: '#ccc', fontWeight: '500' },
  navLabelActive: { color: '#C4922A', fontWeight: '700' },
  navScroll: { flex: 1 },
});
