import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NS } from "../theme/nsTheme";

export function NsHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.logo}>NS</Text>
      <View style={styles.profile}>
        <Text style={styles.profileText}>Jesper</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: NS.yellow,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 20,
    fontWeight: "900",
    color: NS.blue,
  },
  profile: {
    backgroundColor: "#F5C400",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  profileText: {
    fontSize: 13,
    fontWeight: "700",
    color: NS.blue,
  },
});