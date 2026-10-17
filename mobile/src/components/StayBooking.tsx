import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { friendlyError } from "@shared/errors.js";
import { formatNaira } from "@shared/format.js";
import { fetchTakenDates, MAX_STAY_NOTE, requestStay, stayQuote, validateStayRequest, type TakenRange } from "@/lib/stays";
import MonthGrid from "@/components/MonthGrid";
import Tap from "@/components/kit/Tap";
import { Button, Field } from "@/components/kit";
import { colors, fonts, radius } from "@/theme";

type Listing = Record<string, any>;

// The guest's side of a stay: dates, guests, total, note, "Fix a booking".
export default function StayBooking({ listing, today, onBooked }: { listing: Listing; today: string; onBooked: (id: string) => void }) {
  const maxGuests = Number(listing.max_guests) || 1;
  const [dates, setDates] = useState({ checkIn: "", checkOut: "" });
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [taken, setTaken] = useState<TakenRange[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetchTakenDates(String(listing.id)).then((t) => live && setTaken(t));
    return () => {
      live = false;
    };
  }, [listing.id]);

  const quote = dates.checkIn && dates.checkOut ? stayQuote(listing, dates.checkIn, dates.checkOut) : null;

  async function submit() {
    const found = validateStayRequest(listing, { ...dates, guests, note }, taken, today) as unknown as Record<string, string>;
    setErrors(found);
    setError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      onBooked(await requestStay({ listingId: String(listing.id), ...dates, guests, note }));
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <View style={styles.wrap}>
      <MonthGrid checkIn={dates.checkIn} checkOut={dates.checkOut} taken={taken} today={today} onChange={setDates} />
      {errors.checkIn || errors.checkOut ? <Text style={styles.error}>{errors.checkIn || errors.checkOut}</Text> : null}

      <View style={styles.guests}>
        <Text style={styles.label}>Guests</Text>
        <View style={styles.stepper}>
          <Tap accessibilityRole="button" accessibilityLabel="Fewer guests" disabled={guests <= 1} onPress={() => setGuests((g) => Math.max(1, g - 1))} style={[styles.step, guests <= 1 && styles.dim]}>
            <Minus color={colors.ink} size={18} />
          </Tap>
          <Text style={styles.count}>{`${guests} ${guests === 1 ? "guest" : "guests"}`}</Text>
          <Tap accessibilityRole="button" accessibilityLabel="More guests" disabled={guests >= maxGuests} onPress={() => setGuests((g) => Math.min(maxGuests, g + 1))} style={[styles.step, guests >= maxGuests && styles.dim]}>
            <Plus color={colors.ink} size={18} />
          </Tap>
        </View>
      </View>
      {errors.guests ? <Text style={styles.error}>{errors.guests}</Text> : null}

      {quote && quote.nights > 0 ? (
        <View style={styles.quote}>
          {quote.rows.map((r: { label: string; amount: number }) => (
            <View key={r.label} style={styles.qrow}>
              <Text style={styles.qlabel}>{r.label}</Text>
              <Text style={styles.qamount}>{formatNaira(r.amount)}</Text>
            </View>
          ))}
          <View style={[styles.qrow, styles.qtotal]}>
            <Text style={styles.qtotalText}>Total</Text>
            <Text style={styles.qtotalText}>{formatNaira(quote.total)}</Text>
          </View>
        </View>
      ) : null}

      <Field
        label="Note to the host"
        optional
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={MAX_STAY_NOTE}
        placeholder="e.g. Arriving around 6pm with my partner."
        error={errors.note}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Fix a booking" loading={busy} onPress={submit} />
      <Text style={styles.muted}>The host accepts or declines your request. Pay the host directly. Never pay before you&apos;ve confirmed the place is real.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  label: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  guests: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  step: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.lineStrong },
  dim: { opacity: 0.4 },
  count: { minWidth: 72, textAlign: "center", fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  quote: { gap: 6, padding: 12, borderRadius: radius.control, backgroundColor: colors.cream },
  qrow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  qlabel: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  qamount: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  qtotal: { paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.lineStrong },
  qtotalText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
  muted: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
});
