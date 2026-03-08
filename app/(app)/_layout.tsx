import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0F' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="create" />
      <Stack.Screen
        name="capsule/[id]"
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="unlock/[id]"
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen name="share/[id]" />
    </Stack>
  );
}
