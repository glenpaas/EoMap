import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Card, Empty, Loading, Pill, Section, SectionHeader } from '@/components/ui';
import * as api from '@/lib/api';
import { dur, eur, fd, ft } from '@/lib/format';
import type { RemotePhoto, VisitDetail } from '@/lib/types';
import { C, R } from '@/theme';

const TONE = { delivered: 'ok', partial: 'warn', rejected: 'err' } as const;
const LABEL = { delivered: 'Tarnitud', partial: 'Osaline', rejected: 'Keeldutud' } as const;

export default function VisitReport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<RemotePhoto | null>(null);

  useEffect(() => {
    api
      .fetchVisit(String(id))
      .then(({ visit }) => setVisit(visit))
      .catch((err) => setError(err?.message || 'Raporti laadimine ebaõnnestus'));
  }, [id]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Raport" onBack={() => router.back()} />
        <Empty icon="⚠️" title={error} />
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Raport" onBack={() => router.back()} />
        <Loading label="Laen raportit…" />
      </View>
    );
  }

  const before = visit.photos.filter((p) => p.kind === 'before');
  const after = visit.photos.filter((p) => p.kind === 'after');
  const total = visit.orders.reduce((sum, o) => sum + o.qty * o.price, 0);
  const d = dur(visit.checkIn?.time, visit.checkOut?.time);
  const tasksDone = visit.tasks.filter((t) => t.done).length;

  const strip = (list: RemotePhoto[], label: string) =>
    list.length ? (
      <>
        <Text style={s.stripLabel}>
          {label} ({list.length})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
          {list.map((p) => (
            <Pressable key={p.id} onPress={() => setZoom(p)}>
              <Image source={{ uri: api.photoUrl(p.thumbUrl) }} style={s.stripImg} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      </>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar
        title={visit.storeName}
        subtitle={`${visit.userName} · ${fd(visit.checkIn?.time)}`}
        onBack={() => router.back()}
        right={<Pill tone={visit.status === 'active' ? 'warn' : 'ok'}>
          {visit.status === 'active' ? 'Aktiivne' : '✓ Lõpetatud'}
        </Pill>}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section>
          <View style={s.boxRow}>
            <View style={s.box}>
              <Text style={s.boxLabel}>Check-in</Text>
              <Text style={s.boxValue}>{ft(visit.checkIn?.time)}</Text>
            </View>
            <View style={s.box}>
              <Text style={s.boxLabel}>Check-out</Text>
              <Text style={s.boxValue}>{ft(visit.checkOut?.time)}</Text>
            </View>
          </View>
          <View style={[s.boxRow, { marginTop: 8 }]}>
            <View style={[s.box, { backgroundColor: C.ad }]}>
              <Text style={[s.boxLabel, { color: C.a }]}>Kestus</Text>
              <Text style={[s.boxValue, { color: C.a }]}>{d || '—'}</Text>
            </View>
            <View style={[s.box, { backgroundColor: C.okd }]}>
              <Text style={[s.boxLabel, { color: C.ok }]}>Tellimused</Text>
              <Text style={[s.boxValue, { color: C.ok }]}>{eur(total)}</Text>
            </View>
          </View>
        </Section>

        {(visit.checkIn?.gps || visit.checkOut?.gps) && (
          <Section>
            <View style={{ gap: 6 }}>
              {visit.checkIn?.gps && (
                <Text style={s.gps}>
                  📍 Sisse {visit.checkIn.gps.lat.toFixed(5)}, {visit.checkIn.gps.lng.toFixed(5)}
                </Text>
              )}
              {visit.checkOut?.gps && (
                <Text style={s.gps}>
                  📍 Välja {visit.checkOut.gps.lat.toFixed(5)}, {visit.checkOut.gps.lng.toFixed(5)}
                </Text>
              )}
            </View>
          </Section>
        )}

        {visit.photos.length > 0 && (
          <Section>
            <SectionHeader right={<Text style={s.count}>{visit.photos.length}</Text>}>Fotod</SectionHeader>
            {strip(before, 'Enne')}
            {strip(after, 'Pärast')}
          </Section>
        )}

        {visit.notes ? (
          <Section>
            <SectionHeader>Märkmed</SectionHeader>
            <Card>
              <Text style={{ fontSize: 13.5, color: C.t1, lineHeight: 20 }}>{visit.notes}</Text>
            </Card>
          </Section>
        ) : null}

        {visit.tasks.length > 0 && (
          <Section>
            <SectionHeader right={<Text style={s.count}>{tasksDone}/{visit.tasks.length}</Text>}>
              Ülesanded
            </SectionHeader>
            <Card style={{ paddingVertical: 4 }}>
              {visit.tasks.map((t) => (
                <View key={t.id} style={s.line}>
                  <Text style={{ color: t.done ? C.ok : C.t3, marginRight: 8 }}>{t.done ? '✓' : '○'}</Text>
                  <Text
                    style={[
                      { flex: 1, fontSize: 13.5, color: C.t1 },
                      t.done && { textDecorationLine: 'line-through', color: C.t3 },
                    ]}>
                    {t.text}
                  </Text>
                </View>
              ))}
            </Card>
          </Section>
        )}

        {visit.orders.length > 0 && (
          <Section>
            <SectionHeader right={<Text style={s.count}>{eur(total)}</Text>}>Tellimused</SectionHeader>
            <Card style={{ paddingVertical: 4 }}>
              {visit.orders.map((o) => (
                <View key={o.id} style={s.line}>
                  <Text style={{ flex: 1, fontSize: 13.5, color: C.t1 }}>{o.product}</Text>
                  <Text style={{ fontSize: 12.5, color: C.t2 }}>
                    {o.qty} {o.unit}
                    {o.price > 0 ? ` · ${eur(o.qty * o.price)}` : ''}
                  </Text>
                </View>
              ))}
            </Card>
          </Section>
        )}

        {visit.deliveries.length > 0 && (
          <Section>
            <SectionHeader right={<Text style={s.count}>{visit.deliveries.length}</Text>}>Tarne</SectionHeader>
            <Card style={{ paddingVertical: 4 }}>
              {visit.deliveries.map((x) => (
                <View key={x.id} style={s.line}>
                  <Text style={{ flex: 1, fontSize: 13.5, color: C.t1 }}>
                    {x.product} <Text style={{ color: C.t2 }}>· {x.qty} {x.unit}</Text>
                  </Text>
                  <Pill tone={TONE[x.status] ?? 'mute'}>{LABEL[x.status] ?? x.status}</Pill>
                </View>
              ))}
            </Card>
          </Section>
        )}
      </ScrollView>

      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <Pressable style={s.zoomWrap} onPress={() => setZoom(null)}>
          {zoom && (
            <Image
              source={{ uri: api.photoUrl(zoom.url) }}
              style={{ width: '94%', height: '80%' }}
              contentFit="contain"
            />
          )}
          <Text style={{ color: C.t2, fontSize: 12, marginTop: 14 }}>Puuduta sulgemiseks</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  boxRow: { flexDirection: 'row', gap: 8 },
  box: { flex: 1, backgroundColor: C.s2, borderRadius: R.sm, padding: 12 },
  boxLabel: { fontSize: 9.5, color: C.t3, textTransform: 'uppercase', letterSpacing: 0.8 },
  boxValue: { fontSize: 17, fontWeight: '600', color: C.t1, marginTop: 4 },
  gps: {
    alignSelf: 'flex-start',
    fontSize: 11,
    color: C.t2,
    backgroundColor: C.s2,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  count: { fontSize: 11, color: C.t3 },
  stripLabel: { fontSize: 10.5, color: C.t3, marginBottom: 6, marginTop: 4 },
  stripImg: { width: 104, height: 78, borderRadius: 7, backgroundColor: C.s3 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.br,
  },
  zoomWrap: {
    flex: 1,
    backgroundColor: 'rgba(5,6,10,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
