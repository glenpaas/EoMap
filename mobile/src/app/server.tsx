import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import TopBar from '@/components/TopBar';
import { Btn, Card, Field, Section, SectionHeader } from '@/components/ui';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DEFAULT_SERVER_URL } from '@/lib/config';
import { C } from '@/theme';

/**
 * Reachable from the login screen, so a device that must talk to a different
 * server can be pointed at one without the address cluttering every sign-in.
 */
export default function ServerSettings() {
  const router = useRouter();
  const { serverUrl, saveServerUrl } = useAuth();
  const [url, setUrl] = useState(serverUrl);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const ok = await api.ping(url);
    await saveServerUrl(url);
    setBusy(false);
    Alert.alert(
      ok ? 'Salvestatud' : 'Salvestatud, aga server ei vasta',
      ok
        ? 'Server vastab. Võid sisse logida.'
        : 'Kontrolli, et server töötab ja seade on samas võrgus.',
      [{ text: 'Sulge', onPress: () => ok && router.back() }]
    );
  }

  async function reset() {
    setUrl(DEFAULT_SERVER_URL);
    await saveServerUrl(DEFAULT_SERVER_URL);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Serveri seaded" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Section>
          <SectionHeader>Aadress</SectionHeader>
          <Card>
            <Field
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="192.168.1.10:4000"
            />
            <Text style={{ fontSize: 12, color: C.t3, marginTop: 10, lineHeight: 18 }}>
              Vaikimisi kasutab rakendus aadressi {DEFAULT_SERVER_URL}. Muuda seda ainult
              siis, kui server asub mujal.
            </Text>
            <Btn
              title="Salvesta ja kontrolli"
              block
              loading={busy}
              style={{ marginTop: 14 }}
              onPress={save}
            />
            <Btn
              title="Taasta vaikeaadress"
              tone="outline"
              block
              style={{ marginTop: 8 }}
              onPress={reset}
            />
          </Card>
        </Section>
      </ScrollView>
    </View>
  );
}
