import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { container } from "../core/di/container";
import { TravelAlert } from "../core/types/alerts";

import { NsHeader } from "../ui/components/NsHeader";
import { JourneyPlannerCard } from "../ui/components/JourneyPlannerCard";
import { DisruptionsStrip } from "../ui/components/DisruptionsStrip";
import { NsAiUpdateCard } from "../ui/components/NsAiUpdateCard";

export function AppShell() {
  const [alert, setAlert] = useState<TravelAlert | null>(null);

  useEffect(() => {
    return container.notifications.onReceive((a) => setAlert(a));
  }, []);

  async function simulateUnexpectedSituation() {
    await container.poc.simulateUnexpectedSituation();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <NsHeader />

      <ScrollView>
        <JourneyPlannerCard />
        <DisruptionsStrip />

        {alert ? <NsAiUpdateCard alert={alert} /> : null}

        {/* POC-only trigger */}
        <Pressable style={styles.debug} onPress={simulateUnexpectedSituation}>
          <Text style={styles.debugText}>POC: simulate unexpected situation</Text>
        </Pressable>

        <Text style={styles.debugMeta}>
          Providers: {container.calendar.name} / {container.travel.name} / {container.reasoning.name} /{" "}
          {container.notifications.name}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6F6" },
  debug: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "white",
  },
  debugText: { fontSize: 12, fontWeight: "700", color: "#555" },
  debugMeta: { marginHorizontal: 16, marginBottom: 24, fontSize: 11, color: "#777" },
});