import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Btn, Card, Field, Pill, Section, SectionHeader } from '@/components/ui';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useVisit } from '@/lib/visit';
import { C } from '@/theme';

export default function Settings() {
  const router = useRouter();
  const { user, serverUrl, saveServerUrl, signOut } = useAuth();
  const { queue, syncing, lastSyncError, syncNow, active, discard } = useVisit();

  const [url, setUrl] = useState(serverUrl);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function saveUrl() {
    setSaving(true);
    const ok = await api.ping(url);
    await saveServerUrl(url);
    setSaving(false);
    Alert.alert(
      ok ? 'Salvestatud' : 'Salvestatud, aga server ei vasta',
      ok ? 'Server vastab.' : 'Kontrolli, et server töötab ja seade on samas võrgus.'
    );
  }

  async function changePw() {
    if (next.length < 6) return Alert.alert('Liiga lühike', 'Parool peab olema vähemalt 6 märki.');
    setPwBusy(true);
    try {
      await api.changePassword(current, next);
      setCurrent('');
      setNext('');
      Alert.alert('Valmis', 'Parool on muudetud.');
    } catch (err: any) {
      Alert.alert('Ei õnnestunud', err?.message ?? 'Tundmatu viga');
    } finally {
      setPwBusy(false);
    }
  }

  function confirmSignOut() {
    const warn = queue.length > 0 || active;
    Alert.alert(
      'Logi välja',
      warn
        ? 'Seadmes on salvestamata andmeid, mis lähevad väljalogimisel kaotsi. Sünkrooni enne väljalogimist.'
        : 'Kas logida välja?',
      [
        { text: 'Loobu', style: 'cancel' },
        {
          text: 'Logi välja',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Seaded" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section>
          <SectionHeader>Konto</SectionHeader>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: C.t1 }}>{user?.name}</Text>
                <Text style={{ fontSize: 12.5, color: C.t2, marginTop: 3 }}>@{user?.username}</Text>
              </View>
              <Pill tone={user?.role === 'admin' ? 'warn' : 'inf'}>
                {user?.role === 'admin' ? 'Administraator' : 'Välitöötaja'}
              </Pill>
            </View>
          </Card>
        </Section>

        <Section>
          <SectionHeader
            right={
              queue.length > 0 ? (
                <Pill tone="warn">{queue.length} ootel</Pill>
              ) : (
                <Pill tone="ok">Kõik saadetud</Pill>
              )
            }>
            Sünkroonimine
          </SectionHeader>
          <Card>
            {queue.length > 0 ? (
              <>
                <Text style={{ fontSize: 13, color: C.t2, lineHeight: 19 }}>
                  {queue.length} lõpetatud külastust ootab seadmes serverisse saatmist.
                </Text>
                {lastSyncError ? (
                  <Text style={{ fontSize: 12, color: C.err, marginTop: 8 }}>{lastSyncError}</Text>
                ) : null}
                <Btn
                  title="Sünkrooni kohe"
                  icon="cloud-upload-outline"
                  block
                  loading={syncing}
                  style={{ marginTop: 12 }}
                  onPress={syncNow}
                />
              </>
            ) : (
              <Text style={{ fontSize: 13, color: C.t2, lineHeight: 19 }}>
                Kõik külastused on serverisse saadetud.
              </Text>
            )}
          </Card>
        </Section>

        {active && (
          <Section>
            <SectionHeader>Aktiivne külastus</SectionHeader>
            <Card>
              <Text style={{ fontSize: 13, color: C.t2, lineHeight: 19 }}>
                {active.storeName} — {active.photos.length} fotot, {active.orders.length} tellimust.
              </Text>
              <Btn
                title="Katkesta ja kustuta"
                tone="danger"
                block
                style={{ marginTop: 12 }}
                onPress={() =>
                  Alert.alert('Katkesta külastus', 'Kogu sisestatud info kustutatakse jäädavalt.', [
                    { text: 'Loobu', style: 'cancel' },
                    { text: 'Kustuta', style: 'destructive', onPress: discard },
                  ])
                }
              />
            </Card>
          </Section>
        )}

        <Section>
          <SectionHeader>Server</SectionHeader>
          <Card>
            <Field
              label="Aadress"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="192.168.1.10:4000"
            />
            <Btn title="Salvesta ja kontrolli" tone="outline" block loading={saving} style={{ marginTop: 12 }} onPress={saveUrl} />
          </Card>
        </Section>

        <Section>
          <SectionHeader>Parooli muutmine</SectionHeader>
          <Card style={{ gap: 12 }}>
            <Field
              label="Praegune parool"
              value={current}
              onChangeText={setCurrent}
              secureTextEntry
            />
            <Field label="Uus parool" value={next} onChangeText={setNext} secureTextEntry />
            <Btn title="Muuda parool" tone="outline" block loading={pwBusy} onPress={changePw} />
          </Card>
        </Section>

        <Section style={{ marginTop: 24 }}>
          <Btn title="Logi välja" tone="danger" icon="log-out-outline" block onPress={confirmSignOut} />
          <Text style={s.version}>Külastusgraafik · v1.0.0</Text>
        </Section>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  version: { textAlign: 'center', color: C.t3, fontSize: 11, marginTop: 18 },
});
