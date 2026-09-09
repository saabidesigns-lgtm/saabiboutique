import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function BouquetCard({ bouquet, onAddToCart }) {
  return (
    <View style={styles.card}>
      <View style={[styles.imagePlaceholder, { backgroundColor: bouquet.color }]}>
        <Text style={styles.emoji}>{bouquet.emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{bouquet.name}</Text>
        <Text style={styles.description}>{bouquet.description}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>${bouquet.price}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => onAddToCart(bouquet)}>
            <Text style={styles.addText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#c0396b',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    margin: 12,
    width: 260,
  },
  imagePlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
  },
  info: {
    padding: 16,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2d2d2d',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#c0396b',
  },
  addBtn: {
    backgroundColor: '#c0396b',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
