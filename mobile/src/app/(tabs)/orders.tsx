import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Btn, Card, Empty, Field, Pill, Section, Sheet } from '@/components/ui';
import { eur } from '@/lib/format';
import { useVisit } from '@/lib/visit';
import { C } from '@/theme';

export default function Orders() {
  const router = useRouter();
  const { active, addOrder, removeOrder } = useVisit();
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Tellimused" />
        <Empty icon="📦" title="Aktiivseid külastusi pole" sub="Alusta check-in-iga kodulehel">
          <Btn title="Mine koju" onPress={() => router.replace('/')} />
        </Empty>
      </View>
    );
  }

  const total = active.orders.reduce((sum, o) => sum + o.qty * o.price, 0);

  function submit() {
    if (!product.trim()) return setError('Sisesta toote nimi');
    addOrder({
      product: product.trim(),
      qty: parseFloat(qty.replace(',', '.')) || 0,
      unit: unit.trim() || 'tk',
      price: parseFloat(price.replace(',', '.')) || 0,
      notes: notes.trim() || undefined,
    });
    setProduct('');
    setQty('');
    setUnit('');
    setPrice('');
    setNotes('');
    setError('');
    setOpen(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar
        title="Tellimused"
        subtitle={active.storeName}
        right={total > 0 ? <Pill tone="ok">{eur(total)}</Pill> : undefined}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section>
          {active.orders.length > 0 ? (
            <Card style={{ paddingVertical: 4 }}>
              {active.orders.map((o) => (
                <View key={o.id} style={s.row}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.product} numberOfLines={1}>
                      {o.product}
                    </Text>
                    {o.notes ? <Text style={s.notes}>{o.notes}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.qty}>
                      {o.qty} {o.unit}
                    </Text>
                    {o.price > 0 && <Text style={s.price}>{eur(o.qty * o.price)}</Text>}
                  </View>
                  <Pressable onPress={() => removeOrder(o.id)} hitSlop={8}>
                    <Ionicons name="close" size={17} color={C.t3} />
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : (
            <Text style={s.none}>Tellimusi pole lisatud</Text>
          )}

          <Btn title="+ Lisa tellimus" block style={{ marginTop: 10 }} onPress={() => setOpen(true)} />
        </Section>

        {total > 0 && (
          <Section>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: C.t2, fontSize: 14 }}>Tellimuste summa</Text>
              <Text style={{ color: C.a, fontSize: 20, fontWeight: '700' }}>{eur(total)}</Text>
            </Card>
          </Section>
        )}
      </ScrollView>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Lisa tellimus">
        <Field value={product} onChangeText={setProduct} placeholder="Toote nimi" autoFocus />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field value={qty} onChangeText={setQty} placeholder="Kogus" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field value={unit} onChangeText={setUnit} placeholder="Ühik (tk, kg…)" />
          </View>
        </View>
        <Field
          value={price}
          onChangeText={setPrice}
          placeholder="Ühiku hind (€)"
          keyboardType="decimal-pad"
        />
        <Field value={notes} onChangeText={setNotes} placeholder="Märkused (valikuline)" />
        {error ? <Text style={{ color: C.err, fontSize: 13 }}>{error}</Text> : null}
        <Btn title="Lisa tellimus" block onPress={submit} style={{ marginTop: 4 }} />
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.br,
  },
  product: { fontSize: 14, fontWeight: '500', color: C.t1 },
  notes: { fontSize: 11.5, color: C.t3, marginTop: 2 },
  qty: { fontSize: 13, color: C.t2 },
  price: { fontSize: 12.5, color: C.a, marginTop: 2, fontWeight: '500' },
  none: { textAlign: 'center', paddingVertical: 26, color: C.t3, fontSize: 13 },
});
