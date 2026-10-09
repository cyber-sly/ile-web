import { router } from "expo-router";
import { useSession } from "@/lib/useSession";
import ListingWizard from "@/components/wizard/ListingWizard";
import Screen from "@/components/Screen";
import Button from "@/components/Button";

// List a property: the step-by-step wizard, starting fresh or from a saved draft.
export default function NewListingScreen() {
  const { user } = useSession();
  if (!user) {
    return (
      <Screen title="List a property" subtitle="It's free. Log in or create an account to list.">
        <Button label="Log in" onPress={() => router.push("/login")} />
      </Screen>
    );
  }
  return <ListingWizard listing={null} />;
}
