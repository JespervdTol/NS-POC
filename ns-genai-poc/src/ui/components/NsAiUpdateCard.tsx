import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { TravelAlert } from "../../core/types/alerts";
import { NS } from "../theme/nsTheme";

export function NsAiUpdateCard({ alert }: { alert: TravelAlert }) {
  const rec = alert.recommendation;
  if (!rec) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Travel update</Text>
      <Text style={styles.title}>{alert.body}</Text>

      <View style={styles.block}>
        <Text style={styles.bold}>Best option</Text>
        <Text style={styles.line}>{rec.chosen.summary}</Text>
        <Text style={styles.line}>Arrives {rec.chosen.arrivalTime}</Text>
        <Text style={styles.confidence}>
          {Math.round(rec.confidence * 100)}% certainty
        </Text>
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
  block: {
    marginBottom: 10,
  },
  bold: {
    fontSize: 13,
    fontWeight: "800",
  },
  line: {
    fontSize: 13,
    marginTop: 2,
  },
  confidence: {
    marginTop: 4,
    fontSize: 12,
    color: NS.grayText,
  },
  reason: {
    fontSize: 13,
    color: NS.grayText,
    marginBottom: 12,
  },
  cta: {
    backgroundColor: NS.lightBlue,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "800",
    color: NS.blue,
  },
});