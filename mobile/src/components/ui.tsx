import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { C, R } from '../theme';

// ── text ────────────────────────────────────────────────────────────────────
export function T({
  children,
  size = 14,
  color = C.t1,
  weight = '400',
  mono,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  weight?: '300' | '400' | '500' | '600' | '700';
  mono?: boolean;
  style?: any;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontSize: size, color, fontWeight: weight },
        mono && { fontVariant: ['tabular-nums'] },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function SectionHeader({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.secHd}>
      <Text style={s.secHdText}>{children}</Text>
      {right}
    </View>
  );
}

// ── containers ──────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.section, style]}>{children}</View>;
}

// ── pill ────────────────────────────────────────────────────────────────────
const PILL: Record<string, [string, string]> = {
  ok: [C.okd, C.ok],
  warn: [C.ad, C.a],
  err: [C.errd, C.err],
  inf: [C.infd, C.inf],
  pur: [C.purd, C.pur],
  mute: [C.s3, C.t2],
};

export function Pill({
  children,
  tone = 'mute',
  dot,
}: {
  children: ReactNode;
  tone?: keyof typeof PILL;
  dot?: boolean;
}) {
  const [bg, fg] = PILL[tone] ?? PILL.mute;
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {dot && <View style={[s.pillDot, { backgroundColor: fg }]} />}
      <Text style={[s.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
}

// ── button ──────────────────────────────────────────────────────────────────
type BtnTone = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';

export function Btn({
  title,
  onPress,
  tone = 'primary',
  icon,
  block,
  small,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  tone?: BtnTone;
  icon?: keyof typeof Ionicons.glyphMap;
  block?: boolean;
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const tones: Record<BtnTone, { bg: string; fg: string; bd?: string }> = {
    primary: { bg: C.a, fg: C.black },
    outline: { bg: 'transparent', fg: C.t2, bd: C.br2 },
    ghost: { bg: C.s2, fg: C.t2 },
    danger: { bg: C.errd, fg: C.err, bd: 'rgba(239,68,68,0.25)' },
    success: { bg: C.okd, fg: C.ok, bd: 'rgba(16,185,129,0.25)' },
  };
  const t = tones[tone];
  const off = disabled || loading;

  return (
    <Pressable
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSm,
        block && { alignSelf: 'stretch' },
        {
          backgroundColor: t.bg,
          borderColor: t.bd ?? 'transparent',
          borderWidth: t.bd ? 1 : 0,
          opacity: off ? 0.45 : pressed ? 0.82 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={t.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 14 : 16} color={t.fg} />}
          <Text
            style={{
              color: t.fg,
              fontSize: small ? 13 : 14,
              fontWeight: tone === 'primary' ? '600' : '500',
            }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ── inputs ──────────────────────────────────────────────────────────────────
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label?: string; style?: any }) {
  return (
    <View style={{ alignSelf: 'stretch' }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.t3}
        {...props}
        style={[s.input, props.multiline && s.inputMulti, style]}
      />
    </View>
  );
}

// ── feedback ────────────────────────────────────────────────────────────────
export function Empty({
  icon,
  title,
  sub,
  children,
}: {
  icon: string;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIcon}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {sub ? <Text style={s.emptySub}>{sub}</Text> : null}
      {children ? <View style={{ marginTop: 18 }}>{children}</View> : null}
    </View>
  );
}

export function Loading({ label = 'Laen…' }: { label?: string }) {
  return (
    <View style={s.empty}>
      <ActivityIndicator color={C.a} />
      <Text style={[s.emptySub, { marginTop: 12 }]}>{label}</Text>
    </View>
  );
}

// ── bottom sheet ────────────────────────────────────────────────────────────
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.sheetBackdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>{title}</Text>
        {children}
      </View>
    </Modal>
  );
}

// ── styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  section: { paddingHorizontal: 14, marginTop: 16 },
  secHd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  secHdText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.t3,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: C.s2,
    borderWidth: 1,
    borderColor: C.br,
    borderRadius: R.md,
    padding: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '500' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: R.sm,
  },
  btnSm: { paddingHorizontal: 12, paddingVertical: 8 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: C.t3,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.s1,
    borderWidth: 1,
    borderColor: C.br,
    borderRadius: R.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: C.t1,
  },
  inputMulti: { minHeight: 130, textAlignVertical: 'top', lineHeight: 21 },
  empty: { alignItems: 'center', paddingVertical: 54, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 40, opacity: 0.25, marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: C.t2, textAlign: 'center' },
  emptySub: { fontSize: 13, color: C.t3, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: {
    backgroundColor: C.s1,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    gap: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.br2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: C.t1, marginBottom: 6 },
});
