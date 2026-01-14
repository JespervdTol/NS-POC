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
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Travel update</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Suggestion</Text>
        </View>
      </View>

      {/* <Text style={styles.title}>{alert.body}</Text> */}

      {selected ? (
        <View style={styles.compare}>
          <Text style={styles.compareLabel}>Selected train</Text>
          <Text style={styles.compareValue}>{selected.summary}</Text>

          <Text style={styles.compareMeta}>
            Departs {selected.departureTime ?? "??:??"} • Arrives {selected.arrivalTime ?? "??:??"}
          </Text>

          {arriveBy ? (
            <View style={styles.deadlineRow}>
              <Text style={styles.deadlineText}>
                Aim to arrive by <Text style={styles.deadlineStrong}>{arriveBy}</Text>
                {typeof bufferMin === "number" ? ` (keeps ~${bufferMin} min buffer)` : ""}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Suggested option</Text>

        <Text style={styles.optSummary}>{rec.chosen.summary}</Text>

        <Text style={styles.optMeta}>
          Departs {rec.chosen.departureTime ?? "??:??"} • Arrives {rec.chosen.arrivalTime ?? "??:??"}
        </Text>

        {rec?.reason ? <Text style={styles.reason}>{rec.reason}</Text> : null}
      </View>

      <Pressable style={styles.cta}>
        <Text style={styles.ctaText}>View travel advice</Text>
      </Pressable>

      {/* <Text style={styles.disclaimer}>Based on your calendar + current timetable data. Times can still change.</Text> */}
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

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    color: NS.blue,
  },

  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: NS.lightBlue,
    borderWidth: 1,
    borderColor: NS.border,
  },
  badgeText: { fontSize: 11, fontWeight: "900", color: NS.blue },

  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
    marginBottom: 12,
    lineHeight: 20,
  },

  compare: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NS.border,
    backgroundColor: "#FAFAFA",
  },
  compareLabel: { fontSize: 12, fontWeight: "900", color: NS.grayText, marginBottom: 6 },
  compareValue: { fontSize: 13, fontWeight: "900", color: "#111" },
  compareMeta: { marginTop: 4, fontSize: 12, color: NS.grayText },

  deadlineRow: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: NS.lightBlue,
  },
  deadlineText: { fontSize: 12, fontWeight: "900", color: NS.blue },
  deadlineStrong: { fontWeight: "900" },

  block: {
    paddingTop: 2,
    paddingBottom: 12,
  },
  blockTitle: { fontSize: 13, fontWeight: "900", color: "#111", marginBottom: 6 },

  optSummary: { fontSize: 14, fontWeight: "900", color: "#111" },
  optMeta: { marginTop: 4, fontSize: 12, color: NS.grayText },

  reason: { marginTop: 10, fontSize: 13, color: NS.grayText, lineHeight: 18 },

  cta: {
    backgroundColor: NS.lightBlue,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: NS.border,
  },
  ctaText: { fontSize: 14, fontWeight: "900", color: NS.blue },

  disclaimer: {
    marginTop: 10,
    fontSize: 11,
    color: NS.grayText,
  },
});