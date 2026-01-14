import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Pressable, Text, StyleSheet, View, TextInput } from "react-native";

import { container } from "../core/di/container";
import { TravelAlert } from "../core/types/alerts";
import { RouteOption } from "../core/types/travel";

import { NsHeader } from "../ui/components/NsHeader";
// ❌ removed JourneyPlannerCard (top part not used)
// import { JourneyPlannerCard } from "../ui/components/JourneyPlannerCard";
import { DisruptionsStrip } from "../ui/components/DisruptionsStrip";
import { NsAiUpdateCard } from "../ui/components/NsAiUpdateCard";
import { CalendarWatchService } from "../core/services/CalendarWatchService";
import { NS } from "../ui/theme/nsTheme";

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
    const from = (opt as any).from ?? "Eindhoven";
    const to = (opt as any).to ?? "Utrecht Centraal";
    const dep = (opt as any).departureTime ?? "??:??";
    const arr = opt.arrivalTime ?? "??:??";

    return (
      <View style={styles.rowMain}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowTime}>{dep}</Text>
          <Text style={styles.rowRoute}>
            {from} → {to}
          </Text>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.rowArrivesLabel}>Arrives</Text>
          <Text style={styles.rowArrives}>{arr}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <NsHeader />

      <ScrollView contentContainerStyle={styles.scrollPad}>

        <View style={styles.selectorWrap}>
          <View style={styles.selectorHeaderRow}>
            <View>
              <Text style={styles.selectorKicker}>Travel</Text>
              <Text style={styles.selectorTitle}>Choose a train (POC)</Text>
            </View>

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
              keyboardType="numbers-and-punctuation"
            />

            <Pressable
              style={[styles.timeBtn, !isHHMM(departAfter) ? styles.timeBtnDisabled : null]}
              disabled={!isHHMM(departAfter)}
              onPress={loadAlternatives}
            >
              <Text style={styles.timeBtnText}>Load trains</Text>
            </Pressable>
          </View>

          {!isHHMM(departAfter) ? <Text style={styles.timeHint}>Enter time as HH:MM (e.g. 12:00)</Text> : null}

          {selected ? (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedLabel}>Selected train</Text>
              <Text style={styles.selectedValue}>
                {(selected as any).departureTime ?? "??:??"} {(selected as any).from ?? "Eindhoven"} →{" "}
                {(selected as any).to ?? "Utrecht Centraal"} • arrives {selected.arrivalTime ?? "??:??"}
              </Text>

              <Pressable style={styles.clearBtn} onPress={clearSelection}>
                <Text style={styles.clearBtnText}>Clear selection</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.noSelection}>No train selected yet. Tap “Choose” to pick one.</Text>
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

        {/* <Pressable style={styles.debug} onPress={simulateUnexpectedSituation}>
          <Text style={styles.debugText}>POC: simulate unexpected situation</Text>
        </Pressable> */}

        <DisruptionsStrip />
        {/* <Text style={styles.debugMeta}>
          Providers: {container.calendar.name} / {container.travel.name} / {container.reasoning.name} /{" "}
          {container.notifications.name}
        </Text> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6F6" },
  scrollPad: { paddingBottom: 28 },

  selectorWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: NS.border,
    backgroundColor: "white",
  },

  selectorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12 as any,
  },

  selectorKicker: { fontSize: 12, fontWeight: "800", color: NS.blue, marginBottom: 2 },
  selectorTitle: { fontSize: 16, fontWeight: "900", color: "#111" },

  selectorToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NS.border,
    backgroundColor: NS.lightBlue,
  },
  selectorToggleText: { fontSize: 12, fontWeight: "900", color: NS.blue },

  timeRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 as any },
  timeLabel: { fontSize: 12, fontWeight: "900", color: "#333" },

  timeInput: {
    width: 86,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NS.border,
    backgroundColor: "#fff",
    fontSize: 13,
    fontWeight: "900",
    color: "#111",
  },

  timeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: NS.blue,
    borderWidth: 1,
    borderColor: NS.blue,
  },
  timeBtnDisabled: { opacity: 0.45 },
  timeBtnText: { fontSize: 12, fontWeight: "900", color: "white" },
  timeHint: { marginTop: 8, fontSize: 11, color: NS.grayText },

  noSelection: { marginTop: 10, fontSize: 12, color: NS.grayText },

  selectedBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NS.border,
    backgroundColor: "#FAFAFA",
  },
  selectedLabel: { fontSize: 12, fontWeight: "900", color: NS.grayText },
  selectedValue: { marginTop: 6, fontSize: 13, fontWeight: "900", color: "#111" },

  clearBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NS.border,
    backgroundColor: "#fff",
  },
  clearBtnText: { fontSize: 12, fontWeight: "900", color: NS.blue },

  chooserList: { marginTop: 12 },

  chooserEmpty: { fontSize: 12, color: NS.grayText },

  chooserItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NS.border,
    backgroundColor: "#fff",
    marginBottom: 10,
  },

  chooserItemSelected: {
    borderColor: NS.blue,
    backgroundColor: NS.lightBlue,
  },

  rowMain: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 as any },
  rowLeft: { flexShrink: 1 },
  rowTime: { fontSize: 16, fontWeight: "900", color: "#111" },
  rowRoute: { marginTop: 2, fontSize: 12, fontWeight: "800", color: NS.grayText },

  rowRight: { alignItems: "flex-end" },
  rowArrivesLabel: { fontSize: 11, fontWeight: "900", color: NS.grayText },
  rowArrives: { marginTop: 2, fontSize: 14, fontWeight: "900", color: "#111" },

  tapHint: { marginTop: 10, fontSize: 11, fontWeight: "900", color: NS.blue },

  debug: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: NS.border,
    alignItems: "center",
    backgroundColor: "white",
  },
  debugText: { fontSize: 12, fontWeight: "800", color: NS.grayText },
  debugMeta: { marginHorizontal: 16, marginTop: 10, fontSize: 11, color: NS.grayText },
});