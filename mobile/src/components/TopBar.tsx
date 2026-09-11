import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';

export default function TopBar({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingTop: insets.top + 10 }]}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={s.back}>
          <Ionicons name="chevron-back" size={22} color={C.t2} />
        </Pressable>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.br,
  },
  back: { marginLeft: -6 },
  title: { fontSize: 17, fontWeight: '600', color: C.t1 },
  sub: { fontSize: 11, color: C.t2, marginTop: 2 },
});
