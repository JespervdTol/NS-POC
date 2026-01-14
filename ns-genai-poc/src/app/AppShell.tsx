import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Pressable, Text, StyleSheet, View, TextInput } from "react-native";

import { container } from "../core/di/container";
import { TravelAlert } from "../core/types/alerts";
import { RouteOption } from "../core/types/travel";

import { NsHeader } from "../ui/components/NsHeader";
import { JourneyPlannerCard } from "../ui/components/JourneyPlannerCard";
import { DisruptionsStrip } from "../ui/components/DisruptionsStrip";
import { NsAiUpdateCard } from "../ui/components/NsAiUpdateCard";
import { CalendarWatchService } from "../core/services/CalendarWatchService";

function isHHMM(s: string) {
  return /^\d{1,2}:\d{2}$/.test(s.trim());
}

function normalizeHHMM(s: string) {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return s.trim();
  const hh = String(Number(m[1])).padStart(2, "0");
  const mm = m[2];
  return `${hh}:${mm}`;
}

export function AppShell() {
  const [alert, setAlert] = useState<TravelAlert | null>(null);

  const [alternatives, setAlternatives] = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState<RouteOption | null>(null);
  const [showChooser, setShowChooser] = useState(false);

  const [departAfter, setDepartAfter] = useState("15:00");

  const query = useMemo(() => {
    const hhmm = normalizeHHMM(departAfter);
    return {
      from: "Eindhoven",
      to: "Utrecht Centraal",
      station: "EHV",
      departAfter: hhmm,
    };
  }, [departAfter]);

  useEffect(() => {
    const unsubNotif = container.notifications.onReceive((a) => setAlert(a));

    const watcher = new CalendarWatchService({
      calendar: container.calendar,
      onChange: async ({ after }) => {
        console.log("[CAL WATCH] calendar changed");
        await container.monitor.onCalendarChanged({ afterKey: after.key });
      },
    });

    const stopWatch = watcher.start();

    return () => {
      unsubNotif();
      stopWatch();
    };
  }, []);

  async function simulateUnexpectedSituation() {
    await container.poc.simulateUnexpectedSituation();
  }

  async function loadAlternatives() {
    container.monitor.setTravelQuery(query);
    const alts = await container.travel.getAlternatives(query);
    setAlternatives(alts);
  }

  async function selectOption(opt: RouteOption) {
    setSelected(opt);
    await container.monitor.selectOption(opt);
  }

  function clearSelection() {
    setSelected(null);
    container.monitor.clearSelection();
  }

  function renderRow(opt: RouteOption) {
    const from = opt.from ?? "Eindhoven";
    const to = opt.to ?? "Utrecht Centraal";
    const dep = opt.departureTime ?? "??:??";
    const arr = opt.arrivalTime ?? "??:??";

    return (
      <View>
        <Text style={styles.chooserItemText}>
          {dep}  {from} → {to}
        </Text>
        <Text style={styles.chooserItemHint}>Arrives {arr}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <NsHeader />

      <ScrollView>
        <JourneyPlannerCard />
        <DisruptionsStrip />

        <View style={styles.selectorWrap}>
          <View style={styles.selectorHeaderRow}>
            <Text style={styles.selectorTitle}>POC: Select a train</Text>

            <Pressable
              style={styles.selectorToggle}
              onPress={async () => {
                const next = !showChooser;
                setShowChooser(next);
                if (next) await loadAlternatives();
              }}
            >
              <Text style={styles.selectorToggleText}>{showChooser ? "Hide" : "Choose"}</Text>
            </Pressable>
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Depart after</Text>
            <TextInput
              value={departAfter}
              onChangeText={setDepartAfter}
              placeholder="HH:MM"
              style={styles.timeInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={[styles.timeBtn, !isHHMM(departAfter) ? styles.timeBtnDisabled : null]}
              disabled={!isHHMM(departAfter)}
              onPress={loadAlternatives}
            >
              <Text style={styles.timeBtnText}>Load trains</Text>
            </Pressable>
          </View>
          {!isHHMM(departAfter) ? <Text style={styles.timeHint}>Enter time as HH:MM (e.g. 15:00)</Text> : null}

          {selected ? (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedLabel}>Selected</Text>
              <Text style={styles.selectedValue}>
                {selected.departureTime ?? "??:??"}  {(selected.from ?? "Eindhoven")} → {(selected.to ?? "Utrecht Centraal")} • arrives{" "}
                {selected.arrivalTime}
              </Text>

              <Pressable style={styles.clearBtn} onPress={clearSelection}>
                <Text style={styles.clearBtnText}>Clear selection</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.noSelection}>No train selected yet. Pick one from “Choose”.</Text>
          )}

          {showChooser ? (
            <View style={styles.chooserList}>
              {alternatives.length === 0 ? (
                <Text style={styles.chooserEmpty}>No trains returned.</Text>
              ) : (
                alternatives.map((opt) => {
                  const isSelected = selected?.id === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.chooserItem, isSelected ? styles.chooserItemSelected : null]}
                      onPress={() => selectOption(opt)}
                    >
                      {renderRow(opt)}
                      <Text style={styles.tapHint}>{isSelected ? "SELECTED" : "Tap to select"}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}
        </View>

        {alert ? <NsAiUpdateCard alert={alert} /> : null}

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

  selectorWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
  },
  selectorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorTitle: { fontSize: 13, fontWeight: "800", color: "#111" },
  selectorToggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  selectorToggleText: { fontSize: 12, fontWeight: "800", color: "#444" },

  timeRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 as any },
  timeLabel: { fontSize: 12, fontWeight: "800", color: "#333" },
  timeInput: {
    width: 80,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    fontSize: 12,
    fontWeight: "800",
    color: "#111",
  },
  timeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
  timeBtnDisabled: { opacity: 0.5 },
  timeBtnText: { fontSize: 12, fontWeight: "800", color: "#444" },
  timeHint: { marginTop: 6, fontSize: 11, color: "#777" },

  noSelection: { marginTop: 8, fontSize: 12, color: "#666" },

  selectedBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fcfcfc",
  },
  selectedLabel: { fontSize: 11, fontWeight: "800", color: "#666" },
  selectedValue: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#222" },
  clearBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  clearBtnText: { fontSize: 11, fontWeight: "800", color: "#444" },

  chooserList: { marginTop: 10 },
  chooserEmpty: { fontSize: 12, color: "#777" },
  chooserItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  chooserItemSelected: { borderColor: "#bbb", backgroundColor: "#f7f7f7" },
  chooserItemText: { fontSize: 13, fontWeight: "800", color: "#222" },
  chooserItemHint: { marginTop: 2, fontSize: 12, color: "#777" },
  tapHint: { marginTop: 6, fontSize: 11, fontWeight: "800", color: "#555" },

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