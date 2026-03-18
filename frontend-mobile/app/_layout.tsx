import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, 
        contentStyle: { backgroundColor: '#f8fafc' }, 
      }}
    >
      <Stack.Screen name="index" />

    
      <Stack.Screen name="(student)" /> 
      <Stack.Screen name="(instructor)" />

      <Stack.Screen name="add-request" />
      <Stack.Screen name="forgotpassword" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}