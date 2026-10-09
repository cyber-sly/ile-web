import { Stack } from "expo-router";
import MyViewings from "@/components/MyViewings";

// Viewings a lister has booked on other people's properties.
export default function MyViewingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "My viewings" }} />
      <MyViewings />
    </>
  );
}
