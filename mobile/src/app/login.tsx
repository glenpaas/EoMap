import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Btn, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { C } from '@/theme';

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!username.trim() || !password) return setError('Sisesta kasutajanimi ja parool');

    setBusy(true);
    try {
      await signIn(username.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Sisselogimine ebaõnnestus');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={s.wrap}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={s.logo}>
          <Ionicons name="location" size={26} color={C.a} />
        </View>
        <Text style={s.title}>Külastusgraafik</Text>
        <Text style={s.sub}>Poodide külastustarkvara</Text>

        <View style={{ gap: 14, marginTop: 28 }}>
          <Field
            label="Kasutajanimi"
            value={username}
            onChangeText={setUsername}
            placeholder="terje"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />

          <Field
            label="Parool"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Btn title="Logi sisse" onPress={submit} loading={busy} block />
        </View>

        {/* Escape hatch for a device that must reach a different server. */}
        <Pressable onPress={() => router.push('/server')} hitSlop={10} style={s.link}>
          <Text style={s.linkText}>Serveri seaded</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 26 },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.ad,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 30, fontWeight: '700', color: C.t1, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: C.t2, marginTop: 4 },
  error: { color: C.err, fontSize: 13, lineHeight: 18 },
  link: { alignSelf: 'center', marginTop: 28, padding: 8 },
  linkText: { fontSize: 12.5, color: C.t3 },
});
