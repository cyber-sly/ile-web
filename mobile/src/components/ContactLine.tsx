import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Phone } from "lucide-react-native";
import { localPhone } from "@shared/people.js";
import { fetchBookingContact } from "@shared/privacy.js";
import { supabase } from "@/lib/supabase";
import Tap from "@/components/kit/Tap";
import { colors, fonts, radius } from "@/theme";

// The other person's phone on a confirmed viewing or accepted stay. The parent
// only shows this for confirmed bookings; the database checks again.
export default function ContactLine({ kind, id, name }: { kind: "viewing" | "stay"; id: string; name: string }) {
  const [phone, setPhone] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    fetchBookingContact(supabase, kind, id).then((p: string | null) => live && setPhone(p));
    return () => {
      live = false;
    };
  }, [kind, id]);

  if (phone === undefined) return null;
  if (!phone) return <Text style={styles.muted}>No phone number added. Use chat.</Text>;

  return (
    <View style={styles.row}>
      <Text style={styles.number}>{localPhone(phone)}</Text>
      <Tap accessibilityRole="button" accessibilityLabel={`Call ${name}`} onPress={() => void Linking.openURL(`tel:${phone}`)} style={styles.call}>
        <Phone color={colors.white} size={15} />
        <Text style={styles.callText}>Call</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 10, borderRadius: radius.control, backgroundColor: colors.palmSoft },
  number: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  call: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.palm },
  callText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.white },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
});
