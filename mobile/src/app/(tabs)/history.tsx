import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Empty, Loading, Pill, Section } from '@/components/ui';
import * as api from '@/lib/api';
import { dur, eur, fd, ft } from '@/lib/format';
import type { VisitRow } from '@/lib/types';
import { useVisit } from '@/lib/visit';
import { C, R } from '@/theme';

export default function History() {
  const router = useRouter();
  const { queue } = useVisit();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextPage = 1, append = false) => {
    try {
      const data = await api.fetchVisits(nextPage);
      setVisits((prev) => (append ? [...prev, ...data.visits] : data.visits));
      setTotal(data.total);
      setPages(data.pages);
      setPage(nextPage);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Ajaloo laadimine ebaõnnestus');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar
        title="Ajalugu"
        right={<Pill tone="inf">{total} külastust</Pill>}
      />

      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={C.t2}
              onRefresh={() => {
                setRefreshing(true);
                load(1);
              }}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (page < pages) load(page + 1, true);
          }}
          ListHeaderComponent={
            queue.length > 0 ? (
              <View style={s.pending}>
                <Ionicons name="cloud-offline-outline" size={16} color={C.a} />
                <Text style={{ color: C.a, fontSize: 12.5, flex: 1 }}>
                  {queue.length} külastust on seadmes ja ootab saatmist — need ilmuvad siia
                  pärast sünkroonimist.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            error ? (
              <Empty icon="⚠️" title={error} sub="Kontrolli võrguühendust ja tõmba värskendamiseks alla" />
            ) : (
              <Empty icon="📋" title="Ajalugu on tühi" sub="Lõpetatud külastused ilmuvad siia" />
            )
          }
          renderItem={({ item: v }) => {
            const d = dur(v.check_in_time, v.check_out_time);
            return (
              <Pressable style={s.card} onPress={() => router.push(`/visit/${v.id}`)}>
                <View style={s.cardHead}>
                  <Text style={s.store} numberOfLines={1}>
                    {v.store_name}
                  </Text>
                  <Pill tone={v.status === 'active' ? 'warn' : 'ok'}>
                    {v.status === 'active' ? 'Aktiivne' : '✓ Lõpetatud'}
                  </Pill>
                </View>

                <Text style={s.meta}>
                  {fd(v.check_in_time)} · {ft(v.check_in_time)}–{ft(v.check_out_time)}
                  {d ? ` (${d})` : ''}
                </Text>

                <View style={s.pills}>
                  {v.photo_count > 0 && <Pill tone="inf">{v.photo_count} fotot</Pill>}
                  {v.order_count > 0 && (
                    <Pill tone="ok">
                      {v.order_count} tell.{v.order_total > 0 ? ` · ${eur(v.order_total)}` : ''}
                    </Pill>
                  )}
                  {v.delivery_count > 0 && <Pill tone="warn">{v.delivery_count} tarne</Pill>}
                  {v.task_count > 0 && (
                    <Pill tone="mute">
                      {v.task_done}/{v.task_count} ülesannet
                    </Pill>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.ad,
    borderRadius: R.sm,
    padding: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: C.s2,
    borderWidth: 1,
    borderColor: C.br,
    borderRadius: R.md,
    padding: 16,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  store: { flex: 1, fontSize: 15, fontWeight: '600', color: C.t1 },
  meta: { fontSize: 12, color: C.t2, marginBottom: 9 },
  pills: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
});
