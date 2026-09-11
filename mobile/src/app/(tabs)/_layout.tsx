import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useVisit } from '@/lib/visit';
import { C } from '@/theme';

function Dot() {
  return (
    <View
      style={{
        position: 'absolute',
        top: 4,
        right: -9,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: C.err,
        borderWidth: 1.5,
        borderColor: C.bg,
      }}
    />
  );
}

export default function TabLayout() {
  const { active } = useVisit();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.a,
        tabBarInactiveTintColor: C.t3,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.br,
          borderTopWidth: 1,
          height: 76,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kodu',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="visit"
        options={{
          title: 'Külastus',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="location-outline" size={size} color={color} />
              {active ? <Dot /> : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Tellimused',
          tabBarIcon: ({ color, size }) => <Ionicons name="bag-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="delivery"
        options={{
          title: 'Tarne',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Ajalugu',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
