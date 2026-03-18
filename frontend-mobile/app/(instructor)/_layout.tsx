import { Stack } from 'expo-router';

export default function InstructorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, 
        contentStyle: { backgroundColor: '#f1f5f9' },
      }}
    >
      <Stack.Screen name="instructor-dashboard" />
      <Stack.Screen name="students-list" />
      <Stack.Screen name="add-grades" />
      <Stack.Screen name="lectures" />
    </Stack>
  );
}