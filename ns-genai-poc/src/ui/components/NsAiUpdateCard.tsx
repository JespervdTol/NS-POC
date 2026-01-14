import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { TravelAlert } from "../../core/types/alerts";
import { NS } from "../theme/nsTheme";

export function NsAiUpdateCard({ alert }: { alert: TravelAlert }) {
  const rec: any = alert.recommendation;
  if (!rec) return null;

  const selected = rec?.meta?.selected;
  const arriveBy = rec?.meta?.arriveBy as string | undefined;
  const bufferMin = rec?.meta?.bufferMin as number | undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Travel update</Text>
      <Text style={styles.title}>{alert.body}</Text>

      {selected ? (
        <View style={styles.compare}>
          <Text style={styles.compareLabel}>Your selected train</Text>
          <Text style={styles.compareValue}>{selected.summary}</Text>
          <Text style={styles.compareMeta}>
            Departs {selected.departureTime ?? "??:??"} • Arrives {selected.arrivalTime}
          </Text>

          {arriveBy ? (
            <View style={styles.deadlineRow}>
              <Text style={styles.deadlineText}>
                Need to arrive by {arriveBy}
                {typeof bufferMin === "number" ? ` (keeps ~${bufferMin} min buffer)` : ""}
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.bold}>Recommended option</Text>
        <Text style={styles.line}>{rec.chosen.summary}</Text>
        <Text style={styles.line}>
          Departs {rec.chosen.departureTime ?? "??:??"} • Arrives {rec.chosen.arrivalTime}
        </Text>
        <Text style={styles.confidence}>{Math.round(rec.confidence * 100)}% certainty</Text>
      </View>

      <Text style={styles.reason}>{rec.reason}</Text>

      <Pressable style={styles.cta}>
        <Text style={styles.ctaText}>View travel advice</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: NS.border,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: NS.blue,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },

  compare: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NS.border,
    backgroundColor: "#FAFAFA",
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: NS.grayText,
    marginBottom: 4,
  },
  compareValue: { fontSize: 13, fontWeight: "800" },
  compareMeta: { marginTop: 2, fontSize: 12, color: NS.grayText },

  deadlineRow: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: NS.lightBlue,
  },
  deadlineText: { fontSize: 12, fontWeight: "800", color: NS.blue },

  divider: { marginTop: 10, height: 1, backgroundColor: NS.border },

  block: { marginBottom: 10 },
  bold: { fontSize: 13, fontWeight: "800" },
  line: { fontSize: 13, marginTop: 2 },
  confidence: { marginTop: 4, fontSize: 12, color: NS.grayText },
  reason: { fontSize: 13, color: NS.grayText, marginBottom: 12 },

  cta: {
    backgroundColor: NS.lightBlue,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { fontSize: 14, fontWeight: "800", color: NS.blue },
});