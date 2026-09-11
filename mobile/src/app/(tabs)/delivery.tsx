import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Btn, Empty, Field, Pill, Section, Sheet } from '@/components/ui';
import type { DeliveryStatus } from '@/lib/types';
import { useVisit } from '@/lib/visit';
import { C, R } from '@/theme';

const STATUSES: { key: DeliveryStatus; label: string; tone: 'ok' | 'warn' | 'err'; color: string; bg: string }[] = [
  { key: 'delivered', label: '✓ Tarnitud', tone: 'ok', color: C.ok, bg: C.okd },
  { key: 'partial', label: '~ Osaline', tone: 'warn', color: C.a, bg: C.ad },
  { key: 'rejected', label: '✕ Keeldutud', tone: 'err', color: C.err, bg: C.errd },
];

export default function DeliveryScreen() {
  const router = useRouter();
  const { active, addDelivery, removeDelivery } = useVisit();
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<DeliveryStatus>('delivered');
  const [error, setError] = useState('');

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Tarne" />
        <Empty icon="🚚" title="Aktiivseid külastusi pole" sub="Alusta check-in-iga kodulehel">
          <Btn title="Mine koju" onPress={() => router.replace('/')} />
        </Empty>
      </View>
    );
  }

  const counts = {
    delivered: active.deliveries.filter((d) => d.status === 'delivered').length,
    partial: active.deliveries.filter((d) => d.status === 'partial').length,
    rejected: active.deliveries.filter((d) => d.status === 'rejected').length,
  };

  function submit() {
    if (!product.trim()) return setError('Sisesta toote nimi');
    addDelivery({
      product: product.trim(),
      qty: parseFloat(qty.replace(',', '.')) || 0,
      unit: unit.trim() || 'tk',
      status,
      notes: notes.trim() || undefined,
    });
    setProduct('');
    setQty('');
    setUnit('');
    setNotes('');
    setStatus('delivered');
    setError('');
    setOpen(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar
        title="Tarne"
        subtitle={active.storeName}
        right={<Pill tone="mute">{active.deliveries.length} kirjet</Pill>}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {active.deliveries.length > 0 && (
          <Section>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STATUSES.map((st) => (
                <View key={st.key} style={[s.statBox, { backgroundColor: st.bg }]}>
                  <Text style={[s.statNum, { color: st.color }]}>{counts[st.key]}</Text>
                  <Text style={[s.statLbl, { color: st.color }]}>{st.label.slice(2)}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section>
          {active.deliveries.length > 0 ? (
            <View style={{ gap: 8 }}>
              {active.deliveries.map((d) => {
                const st = STATUSES.find((x) => x.key === d.status)!;
                return (
                  <View key={d.id} style={s.card}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.product}>{d.product}</Text>
                      <Text style={s.qty}>
                        {d.qty} {d.unit}
                      </Text>
                      {d.notes ? <Text style={s.notes}>{d.notes}</Text> : null}
                    </View>
                    <Pill tone={st.tone}>{st.label.slice(2)}</Pill>
                    <Pressable onPress={() => removeDelivery(d.id)} hitSlop={8}>
                      <Ionicons name="close" size={17} color={C.t3} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={s.none}>Tarne kirjeid pole lisatud</Text>
          )}

          <Btn title="+ Lisa tarne kirje" block style={{ marginTop: 10 }} onPress={() => setOpen(true)} />
        </Section>
      </ScrollView>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Lisa tarne kirje">
        <Field value={product} onChangeText={setProduct} placeholder="Toote nimi" autoFocus />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field value={qty} onChangeText={setQty} placeholder="Kogus" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field value={unit} onChangeText={setUnit} placeholder="Ühik" />
          </View>
        </View>

        <Text style={s.pickLabel}>Tarnestaatus</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {STATUSES.map((st) => {
            const on = status === st.key;
            return (
              <Pressable
                key={st.key}
                onPress={() => setStatus(st.key)}
                style={[
                  s.statusBtn,
                  on && { borderColor: st.color, backgroundColor: st.bg },
                ]}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: on ? st.color : C.t2 }}>
                  {st.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field value={notes} onChangeText={setNotes} placeholder="Märkused" />
        {error ? <Text style={{ color: C.err, fontSize: 13 }}>{error}</Text> : null}
        <Btn title="Lisa kirje" block onPress={submit} style={{ marginTop: 4 }} />
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  statBox: { flex: 1, borderRadius: R.sm, paddingVertical: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLbl: { fontSize: 10, fontWeight: '500', marginTop: 3 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.s1,
    borderWidth: 1,
    borderColor: C.br,
    borderRadius: R.sm,
    padding: 12,
  },
  product: { fontSize: 14, fontWeight: '500', color: C.t1 },
  qty: { fontSize: 12, color: C.t2, marginTop: 2 },
  notes: { fontSize: 11.5, color: C.t3, marginTop: 2 },
  none: { textAlign: 'center', paddingVertical: 26, color: C.t3, fontSize: 13 },
  pickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 4,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderColor: C.br,
    backgroundColor: C.s2,
    alignItems: 'center',
  },
});
