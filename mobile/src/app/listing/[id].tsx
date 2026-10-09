import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Screen from "@/components/Screen";

// Replaced by the full listing screen in Task 6.
export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen title="Listing">
      <Text>{id}</Text>
    </Screen>
  );
}
