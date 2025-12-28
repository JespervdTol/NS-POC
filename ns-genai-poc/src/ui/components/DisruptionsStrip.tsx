import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NS } from "../theme/nsTheme";

export function DisruptionsStrip() {
  return (
    <View style={styles.strip}>
      <Text style={styles.text}>🚧 Disruptions and engineering works (3)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: NS.yellow,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
    color: NS.blue,
  },
});