import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Btn, Card, Empty, Loading, Pill, Section, SectionHeader, Sheet } from '@/components/ui';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dur, fd, ft } from '@/lib/format';
import type { Store, VisitRow } from '@/lib/types';
import { useVisit } from '@/lib/visit';
import { C, R } from '@/theme';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { active, queue, syncing, checkIn, checkOut, syncNow } = useVisit();

  const [stores, setStores] = useState<Store[]>([]);
  const [recent, setRecent] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ stores }, { visits }] = await Promise.all([api.fetchStores(), api.fetchVisits(1)]);
      setStores(stores);
      setRecent(visits.slice(0, 4));
      setOffline(false);
    } catch {
      // Cached stores keep check-in working with no signal.
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCheckIn(store: Store) {
    setPicker(false);
    setBusy(true);
    await checkIn(store);
    setBusy(false);
    router.push('/visit');
  }

  function onCheckOut() {
    Alert.alert('Lõpeta külastus', 'Külastus salvestatakse ja saadetakse serverisse.', [
      { text: 'Loobu', style: 'cancel' },
      {
        text: 'Check-Out',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const res = await checkOut();
          setBusy(false);
          if (res.synced) {
            Alert.alert('Salvestatud', 'Külastus on serverisse saadetud.');
            load();
          } else {
            Alert.alert(
              'Salvestatud seadmesse',
              `Ühendust ei olnud (${res.error}). Külastus saadetakse automaatselt, kui võrk taastub.`
            );
          }
        },
      },
    ]);
  }

  const doneTasks = active?.tasks.filter((t) => t.done).length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar
        title={`Külastusgraafik, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle={fd(new Date().toISOString())}
        right={
          <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
            <Ionicons name="settings-outline" size={20} color={C.t2} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.t2} />}>
        {offline && (
          <View style={s.offline}>
            <Text style={s.offlineText}>⚡ Serverit ei õnnestu praegu ühendada</Text>
          </View>
        )}

        {queue.length > 0 && (
          <Section>
            <Pressable onPress={syncNow} style={s.queueBar}>
              <Ionicons name="cloud-upload-outline" size={17} color={C.a} />
              <Text style={s.queueText}>
                {queue.length} külastust ootab saatmist
                {syncing ? ' — saadan…' : ' — puuduta, et proovida'}
              </Text>
            </Pressable>
          </Section>
        )}

        {active ? (
          <Section>
            <SectionHeader right={<Pill tone="warn" dot>Aktiivne</Pill>}>
              Aktiivne külastus
            </SectionHeader>
            <Card>
              <Text style={s.storeName}>{active.storeName}</Text>
              <Text style={s.timeBig}>{ft(active.checkIn.time)}</Text>
              <Text style={s.timeDate}>{fd(active.checkIn.time)}</Text>

              <View style={s.gps}>
                <Text style={s.gpsText}>
                  {active.checkIn.gps
                    ? `📍 ${active.checkIn.gps.lat.toFixed(5)}, ${active.checkIn.gps.lng.toFixed(5)} · ±${Math.round(active.checkIn.gps.accuracy)}m`
                    : '📍 GPS puudub'}
                </Text>
              </View>

              <View style={s.miniStats}>
                <View style={[s.miniStat, { backgroundColor: C.infd }]}>
                  <Text style={[s.miniNum, { color: C.inf }]}>{active.photos.length}</Text>
                  <Text style={[s.miniLbl, { color: C.inf }]}>Fotot</Text>
                </View>
                <View style={[s.miniStat, { backgroundColor: C.okd }]}>
                  <Text style={[s.miniNum, { color: C.ok }]}>
                    {doneTasks}/{active.tasks.length}
                  </Text>
                  <Text style={[s.miniLbl, { color: C.ok }]}>Ülesannet</Text>
                </View>
                <View style={[s.miniStat, { backgroundColor: C.ad }]}>
                  <Text style={[s.miniNum, { color: C.a }]}>{active.orders.length}</Text>
                  <Text style={[s.miniLbl, { color: C.a }]}>Tellimust</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Btn
                  title="Jätka külastust"
                  tone="outline"
                  small
                  style={{ flex: 1 }}
                  onPress={() => router.push('/visit')}
                />
                <Btn
                  title="Check-Out"
                  tone="danger"
                  small
                  icon="exit-outline"
                  loading={busy}
                  style={{ flex: 1 }}
                  onPress={onCheckOut}
                />
              </View>
            </Card>
          </Section>
        ) : (
          <Section>
            <SectionHeader>Uus külastus</SectionHeader>
            <Card>
              <Text style={{ fontSize: 13, color: C.t2, marginBottom: 12 }}>
                Vali pood ja tee check-in — asukoht salvestatakse automaatselt.
              </Text>
              <Btn
                title={stores.length ? 'Vali pood ja alusta' : 'Poode ei leitud'}
                icon="location"
                block
                disabled={!stores.length}
                loading={busy}
                onPress={() => setPicker(true)}
              />
            </Card>
          </Section>
        )}

        <Section>
          <SectionHeader
            right={
              recent.length ? (
                <Pressable onPress={() => router.push('/history')}>
                  <Text style={{ fontSize: 12, color: C.a }}>Kõik →</Text>
                </Pressable>
              ) : undefined
            }>
            Viimased külastused
          </SectionHeader>

          {loading ? (
            <Loading />
          ) : recent.length === 0 ? (
            <Empty icon="📋" title="Külastusi pole veel" sub="Alusta esimese poekülastusega ülal" />
          ) : (
            <View style={{ gap: 8 }}>
              {recent.map((v) => (
                <Pressable
                  key={v.id}
                  style={s.visitRow}
                  onPress={() => router.push(`/visit/${v.id}`)}>
                  <View style={s.visitIcon}>
                    <Ionicons name="checkmark" size={17} color={C.ok} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.visitStore} numberOfLines={1}>
                      {v.store_name}
                    </Text>
                    <Text style={s.visitMeta}>
                      {fd(v.check_in_time)} · {ft(v.check_in_time)}–{ft(v.check_out_time)}
                      {dur(v.check_in_time, v.check_out_time)
                        ? ` · ${dur(v.check_in_time, v.check_out_time)}`
                        : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                      {v.photo_count > 0 && <Pill tone="inf">{v.photo_count} fotot</Pill>}
                      {v.order_count > 0 && <Pill tone="ok">{v.order_count} tell.</Pill>}
                      {v.delivery_count > 0 && <Pill tone="warn">{v.delivery_count} tarne</Pill>}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.t3} />
                </Pressable>
              ))}
            </View>
          )}
        </Section>
      </ScrollView>

      <Sheet visible={picker} onClose={() => setPicker(false)} title="Vali pood">
        <ScrollView style={{ maxHeight: 380 }}>
          {stores.map((store) => (
            <Pressable key={store.id} style={s.storeOption} onPress={() => onCheckIn(store)}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: C.t1, fontWeight: '500' }}>{store.name}</Text>
                {store.address ? (
                  <Text style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{store.address}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.t3} />
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  offline: {
    backgroundColor: C.errd,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239,68,68,0.3)',
  },
  offlineText: { color: C.err, fontSize: 12, textAlign: 'center' },
  queueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.ad,
    borderRadius: R.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.28)',
  },
  queueText: { color: C.a, fontSize: 13, flex: 1 },
  storeName: { fontSize: 13, color: C.t2, marginBottom: 6 },
  timeBig: { fontSize: 32, fontWeight: '700', color: C.a, letterSpacing: 0.5 },
  timeDate: { fontSize: 12, color: C.t2, marginTop: 2 },
  gps: {
    alignSelf: 'flex-start',
    backgroundColor: C.s1,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.br,
  },
  gpsText: { fontSize: 10.5, color: C.t2 },
  miniStats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  miniStat: { flex: 1, borderRadius: R.sm, paddingVertical: 10, alignItems: 'center' },
  miniNum: { fontSize: 18, fontWeight: '700' },
  miniLbl: { fontSize: 10, marginTop: 2 },
  visitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.s2,
    borderWidth: 1,
    borderColor: C.br,
    borderRadius: R.md,
    padding: 14,
  },
  visitIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.okd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitStore: { fontSize: 14, fontWeight: '500', color: C.t1 },
  visitMeta: { fontSize: 12, color: C.t2, marginTop: 2 },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.br,
  },
});
