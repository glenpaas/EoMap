import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import TopBar from '@/components/TopBar';
import { Btn, Card, Empty, Field, Pill, Section, SectionHeader, Sheet } from '@/components/ui';
import { fd, ft } from '@/lib/format';
import { processPhoto } from '@/lib/photos';
import type { PhotoKind } from '@/lib/types';
import { useVisit } from '@/lib/visit';
import { C, R } from '@/theme';

type Tab = 'photos' | 'notes' | 'tasks';

export default function VisitScreen() {
  const router = useRouter();
  const { active, addPhoto, removePhoto, setNotes, addTask, toggleTask, removeTask } = useVisit();
  const [tab, setTab] = useState<Tab>('photos');
  const [busyKind, setBusyKind] = useState<PhotoKind | null>(null);
  const [taskSheet, setTaskSheet] = useState(false);
  const [taskText, setTaskText] = useState('');

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <TopBar title="Külastus" />
        <Empty icon="📍" title="Aktiivseid külastusi pole" sub="Mine Kodusse ja tee check-in">
          <Btn title="Mine koju" onPress={() => router.replace('/')} />
        </Empty>
      </View>
    );
  }

  async function capture(kind: PhotoKind, fromLibrary: boolean) {
    const perm = fromLibrary
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();

    if (!perm.granted) {
      Alert.alert(
        'Luba puudub',
        fromLibrary
          ? 'Anna rakendusele ligipääs galeriile seadme seadetes.'
          : 'Anna rakendusele ligipääs kaamerale seadme seadetes.'
      );
      return;
    }

    const result = fromLibrary
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });

    if (result.canceled || !result.assets?.[0]) return;

    setBusyKind(kind);
    try {
      const processed = await processPhoto(result.assets[0].uri);
      addPhoto(kind, processed.uri, processed.width, processed.height, processed.thumbUri);
    } catch (err: any) {
      Alert.alert('Pildi töötlemine ebaõnnestus', err?.message ?? 'Tundmatu viga');
    } finally {
      setBusyKind(null);
    }
  }

  function pickSource(kind: PhotoKind) {
    Alert.alert('Lisa foto', undefined, [
      { text: 'Tee pilt', onPress: () => capture(kind, false) },
      { text: 'Vali galeriist', onPress: () => capture(kind, true) },
      { text: 'Loobu', style: 'cancel' },
    ]);
  }

  function submitTask() {
    const text = taskText.trim();
    if (!text) return;
    addTask(text);
    setTaskText('');
    setTaskSheet(false);
  }

  const before = active.photos.filter((p) => p.kind === 'before');
  const after = active.photos.filter((p) => p.kind === 'after');
  const doneCount = active.tasks.filter((t) => t.done).length;
  const pct = active.tasks.length ? Math.round((doneCount / active.tasks.length) * 100) : 0;

  const photoGrid = (list: typeof before, kind: PhotoKind, label: string) => (
    <View style={s.grid}>
      {list.map((p) => (
        <View key={p.id} style={s.thumb}>
          <Image source={{ uri: p.thumbUri || p.uri }} style={{ flex: 1 }} contentFit="cover" />
          <View style={s.thumbMeta}>
            <Text style={s.thumbMetaText}>{ft(p.takenAt)}</Text>
          </View>
          <Pressable
            style={s.thumbDel}
            hitSlop={6}
            onPress={() =>
              Alert.alert('Kustuta foto', 'Foto eemaldatakse külastusest.', [
                { text: 'Loobu', style: 'cancel' },
                { text: 'Kustuta', style: 'destructive', onPress: () => removePhoto(p.id) },
              ])
            }>
            <Ionicons name="close" size={13} color="#fff" />
          </Pressable>
        </View>
      ))}

      <Pressable style={s.upload} onPress={() => pickSource(kind)} disabled={busyKind === kind}>
        {busyKind === kind ? (
          <ActivityIndicator color={C.a} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={22} color={C.t3} />
            <Text style={s.uploadText}>+ {label}</Text>
          </>
        )}
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}>
      <TopBar
        title={active.storeName}
        subtitle={`Check-in ${ft(active.checkIn.time)} · ${fd(active.checkIn.time)}`}
        right={<Pill tone="warn" dot>Live</Pill>}
      />

      <View style={s.tabs}>
        {(
          [
            ['photos', 'Fotod'],
            ['notes', 'Märkmed'],
            ['tasks', 'Ülesanded'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, tab === key && s.tabOn]}>
            <Text style={[s.tabText, tab === key && s.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">
        {tab === 'photos' && (
          <>
            <Section>
              <SectionHeader
                right={<Text style={s.count}>{before.length} fotot</Text>}>
                Enne pildid
              </SectionHeader>
              {photoGrid(before, 'before', 'Enne foto')}
            </Section>
            <Section style={{ marginTop: 22 }}>
              <SectionHeader right={<Text style={s.count}>{after.length} fotot</Text>}>
                Pärast pildid
              </SectionHeader>
              {photoGrid(after, 'after', 'Pärast foto')}
            </Section>
          </>
        )}

        {tab === 'notes' && (
          <Section>
            <SectionHeader>Märkmed</SectionHeader>
            <Field
              multiline
              value={active.notes}
              onChangeText={setNotes}
              placeholder="Kirjuta siia märkmed, tähelepanekud, probleemid, lahendused…"
            />
            <Text style={s.autosave}>{active.notes.length} märki · salvestub automaatselt</Text>
          </Section>
        )}

        {tab === 'tasks' && (
          <Section>
            <SectionHeader
              right={
                <Text style={s.count}>
                  {doneCount}/{active.tasks.length} · {pct}%
                </Text>
              }>
              Ülesanded
            </SectionHeader>

            {active.tasks.length > 0 ? (
              <>
                <View style={s.progress}>
                  <View style={[s.progressFill, { width: `${pct}%` }]} />
                </View>
                <Card style={{ paddingVertical: 4 }}>
                  {active.tasks.map((t) => (
                    <View key={t.id} style={s.taskRow}>
                      <Pressable
                        onPress={() => toggleTask(t.id)}
                        hitSlop={8}
                        style={[s.check, t.done && s.checkOn]}>
                        {t.done && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </Pressable>
                      <Text style={[s.taskText, t.done && s.taskDone]}>{t.text}</Text>
                      <Pressable onPress={() => removeTask(t.id)} hitSlop={8}>
                        <Ionicons name="close" size={17} color={C.t3} />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              </>
            ) : (
              <Text style={s.noneText}>Ülesandeid pole lisatud</Text>
            )}

            <Btn
              title="+ Lisa ülesanne"
              tone="outline"
              block
              style={{ marginTop: 10 }}
              onPress={() => setTaskSheet(true)}
            />
          </Section>
        )}
      </ScrollView>

      <Sheet visible={taskSheet} onClose={() => setTaskSheet(false)} title="Lisa ülesanne">
        <Field
          value={taskText}
          onChangeText={setTaskText}
          placeholder="Ülesande kirjeldus…"
          autoFocus
          onSubmitEditing={submitTask}
          returnKeyType="done"
        />
        <Btn title="Lisa ülesanne" block onPress={submitTask} style={{ marginTop: 4 }} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.br },
  tab: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: C.a },
  tabText: { fontSize: 13, fontWeight: '500', color: C.t3 },
  tabTextOn: { color: C.a },
  count: { fontSize: 11, color: C.t3, fontWeight: '400' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: {
    width: '48%',
    aspectRatio: 4 / 3,
    borderRadius: R.sm,
    overflow: 'hidden',
    backgroundColor: C.s1,
    borderWidth: 1,
    borderColor: C.br,
  },
  thumbMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  thumbMetaText: { fontSize: 9.5, color: '#fff' },
  thumbDel: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upload: {
    width: '48%',
    aspectRatio: 4 / 3,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.br2,
    backgroundColor: C.s1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  uploadText: { fontSize: 11, color: C.t3 },
  autosave: { fontSize: 11, color: C.t3, marginTop: 7, textAlign: 'right' },
  progress: { height: 4, backgroundColor: C.s2, borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.ok, borderRadius: 2 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.br,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.br2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.ok, borderColor: C.ok },
  taskText: { flex: 1, fontSize: 14, color: C.t1, lineHeight: 19 },
  taskDone: { textDecorationLine: 'line-through', color: C.t3 },
  noneText: { textAlign: 'center', paddingVertical: 22, color: C.t3, fontSize: 13 },
});
