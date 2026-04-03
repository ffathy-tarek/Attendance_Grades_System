import { Stack } from "expo-router";

export default function StudentLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, 
        contentStyle: { backgroundColor: '#f1f5f9' },
      }}
    >
      <Stack.Screen name="student-dashboard" /> 
      <Stack.Screen name="student-courses" />
      <Stack.Screen name="student-course-details" />
      <Stack.Screen name="student-attendance" />
      <Stack.Screen name="student-grades" />
      <Stack.Screen name="student-profile" />
    </Stack>
  );
}