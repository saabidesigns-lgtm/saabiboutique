import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { getOrders, getCustomers } from '../../utils/api';
import { notifyError } from '../../utils/notify';

const STATUS_COLOR = {
  Pending: '#999',
  Processing: '#C4922A',
  Shipped: '#3B82F6',
  Delivered: '#4CAF50',
  Cancelled: '#e63946',
};

export default function AdminDashboard({ products }) {
  const [orders, setOrders] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOrders(), getCustomers()])
      .then(([orders, customers]) => {
        setOrders(orders);
        setCustomerCount(customers.length);
      })
      .catch(notifyError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C4922A" />
      </View>
    );
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: 'Total Orders',  value: String(orders.length),                      icon: '📦', color: '#FDF3E3', border: '#C4922A' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`,  icon: '💰', color: '#F0FFF4', border: '#4CAF50' },
    { label: 'Customers',     value: String(customerCount),                      icon: '👥', color: '#EFF6FF', border: '#3B82F6' },
    { label: 'Products',      value: String(products.length),                    icon: '👗', color: '#FDF2F8', border: '#C084FC' },
  ];

  const recentOrders = orders.slice(0, 5).map((o) => ({
    id: o.id,
    customer: o.customer,
    item: o.itemsLabel[0] || '—',
    amount: o.totalLabel,
    status: o.status,
    statusColor: STATUS_COLOR[o.status] || '#999',
  }));

  const productStats = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      if (!productStats[item.name]) productStats[item.name] = { sold: 0, revenue: 0 };
      productStats[item.name].sold += item.qty || 1;
      productStats[item.name].revenue += (item.price || 0) * (item.qty || 1);
    });
  });
  const topProducts = Object.entries(productStats)
    .map(([name, s]) => ({ name, sold: s.sold, revenue: `₹${s.revenue.toLocaleString('en-IN')}` }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 4);
  const maxSold = topProducts.length > 0 ? topProducts[0].sold : 1;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>📊 Dashboard</Text>
      <Text style={styles.pageSub}>Welcome back! Here's your store overview.</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: s.color, borderColor: s.border }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Recent Orders</Text>
        {recentOrders.length === 0 ? (
          <Text style={styles.emptyText}>No orders yet.</Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableHead, { flex: 0.6 }]}>Order</Text>
              <Text style={[styles.tableCell, styles.tableHead, { flex: 1.2 }]}>Customer</Text>
              <Text style={[styles.tableCell, styles.tableHead, { flex: 1.4 }]}>Item</Text>
              <Text style={[styles.tableCell, styles.tableHead, { flex: 0.8 }]}>Amount</Text>
              <Text style={[styles.tableCell, styles.tableHead, { flex: 0.9 }]}>Status</Text>
            </View>
            {recentOrders.map((o) => (
              <View key={o.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 0.6, color: '#C4922A', fontWeight: '700' }]}>{o.id}</Text>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>{o.customer}</Text>
                <Text style={[styles.tableCell, { flex: 1.4 }]} numberOfLines={1}>{o.item}</Text>
                <Text style={[styles.tableCell, { flex: 0.8, fontWeight: '700' }]}>{o.amount}</Text>
                <View style={[styles.statusBadge, { flex: 0.9, backgroundColor: o.statusColor + '20', borderColor: o.statusColor }]}>
                  <Text style={[styles.statusText, { color: o.statusColor }]}>{o.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Top Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Top Selling Products</Text>
        {topProducts.length === 0 ? (
          <Text style={styles.emptyText}>No sales yet.</Text>
        ) : (
          topProducts.map((p, i) => (
            <View key={p.name} style={styles.topProduct}>
              <Text style={styles.topRank}>#{i + 1}</Text>
              <View style={styles.topBar}>
                <Text style={styles.topName}>{p.name}</Text>
                <View style={[styles.topProgress, { width: `${(p.sold / maxSold) * 100}%` }]} />
              </View>
              <Text style={styles.topSold}>{p.sold} sold</Text>
              <Text style={styles.topRevenue}>{p.revenue}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0', padding: 24 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5F0' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#1C1611', marginBottom: 4 },
  pageSub: { fontSize: 14, color: '#999', marginBottom: 24 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
  statCard: {
    flex: 1, minWidth: 140, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: '900', color: '#1C1611', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#888', fontWeight: '600', textAlign: 'center' },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    marginBottom: 20, borderWidth: 1, borderColor: '#F0E6CC',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1C1611', marginBottom: 16 },
  emptyText: { fontSize: 13, color: '#aaa', fontStyle: 'italic', paddingVertical: 8 },
  table: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#F0E6CC' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F9F0E0' },
  tableHeader: { backgroundColor: '#FDF3E3' },
  tableCell: { fontSize: 13, color: '#444', paddingHorizontal: 4 },
  tableHead: { fontWeight: '700', color: '#C4922A', fontSize: 12, textTransform: 'uppercase' },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignItems: 'center' },
  statusText: { fontSize: 11, fontWeight: '700' },
  topProduct: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  topRank: { fontSize: 14, fontWeight: '800', color: '#C4922A', width: 24 },
  topBar: { flex: 1 },
  topName: { fontSize: 13, color: '#1C1611', fontWeight: '600', marginBottom: 4 },
  topProgress: { height: 6, backgroundColor: '#C4922A', borderRadius: 4, minWidth: 10 },
  topSold: { fontSize: 12, color: '#888', width: 50, textAlign: 'right' },
  topRevenue: { fontSize: 13, fontWeight: '700', color: '#1C1611', width: 70, textAlign: 'right' },
});
