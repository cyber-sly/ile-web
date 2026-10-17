import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AtSign, Phone } from "lucide-react-native";
import { normalizeUsername, usernameError } from "@shared/people.js";
import { usernameAvailable } from "@shared/privacy.js";
import { supabase } from "@/lib/supabase";
import Field from "@/components/Field";
import Chip from "@/components/Chip";
import { colors, fonts } from "@/theme";

type Form = Record<string, any>;

// Username (with a live check), what others see, and the private phone number.
export default function PrivacyFields({ v, set, errors }: { v: Form; set: (changes: Form) => void; errors: Record<string, string> }) {
  const [check, setCheck] = useState<{ name: string; state: "" | "checking" | "free" | "taken" }>({ name: "", state: "" });
  const typed = normalizeUsername(v.username);
  const formatError = typed ? (usernameError(typed) as string | null) : null;

  // Ask the database once typing pauses.
  useEffect(() => {
    if (!typed || usernameError(typed)) return;
    let live = true;
    const timer = setTimeout(() => {
      setCheck({ name: typed, state: "checking" });
      usernameAvailable(supabase, typed).then((ok: boolean | null) => {
        if (live) setCheck({ name: typed, state: ok === null ? "" : ok ? "free" : "taken" });
      });
    }, 500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [typed]);

  const state = check.name === typed ? check.state : "";
  const usernameErrorText = errors.username || formatError || (state === "taken" ? "That username is taken." : undefined);
  const hint = state === "free" ? "Available" : state === "checking" ? "Checking…" : "Letters, numbers and _ (3–20). Others can see it.";

  return (
    <>
      <Field
        label="Username (optional)"
        icon={AtSign}
        value={v.username}
        onChangeText={(username) => set({ username })}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={21}
        placeholder="e.g. tunde_homes"
        error={usernameErrorText}
        hint={usernameErrorText ? undefined : hint}
      />
      <View style={styles.group}>
        <Text style={styles.label}>Show others my</Text>
        <View style={styles.chips}>
          <Chip label="Name" selected={v.show_as !== "username"} onPress={() => set({ show_as: "name" })} />
          <Chip label={typed ? `@${typed}` : "@username"} selected={v.show_as === "username"} onPress={() => set({ show_as: "username" })} />
        </View>
        {errors.show_as ? <Text style={styles.error}>{errors.show_as}</Text> : null}
      </View>
      <Field
        label="Phone number (optional)"
        icon={Phone}
        value={v.phone}
        onChangeText={(phone) => set({ phone })}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="0803 123 4567"
        error={errors.phone}
        hint="Private. Only shared with the other person after a booking is confirmed."
      />
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay },
});
