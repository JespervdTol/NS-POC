import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { NS } from "../theme/nsTheme";

export function JourneyPlannerCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.place}>Utrecht Centraal</Text>
      <Text style={styles.place}>Eindhoven</Text>

      <View style={styles.row}>
        <View style={styles.departure}>
          <Text style={styles.departureText}>Departure: now</Text>
        </View>
        <View style={styles.options}>
          <Text style={styles.optionsText}>Options</Text>
        </View>
      </View>

      <Pressable style={styles.cta}>
        <Text style={styles.ctaText}>Plan your journey</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    margin: 16,
    padding: 16,
    borderRadius: 18,
  },
  place: {
    fontSize: 16,
    fontWeight: "800",
    color: NS.blue,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  departure: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: NS.lightBlue,
  },
  departureText: {
    fontSize: 13,
    fontWeight: "700",
    color: NS.blue,
  },
  options: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: NS.yellow,
  },
  optionsText: {
    fontSize: 13,
    fontWeight: "700",
    color: NS.blue,
  },
  cta: {
    marginTop: 12,
    backgroundColor: "#005BBB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
  },
});