import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { Theme } from "../theme/theme";
import { GameRecord } from "../game/game";

interface StatsSheetProps {
  visible: boolean;
  onClose: () => void;
  history: GameRecord[];
  theme: Theme;
  onReset: () => void;
}

export default function StatsSheet({ visible, onClose, history, theme, onReset }: StatsSheetProps) {
  const [confirming, setConfirming] = useState(false);

  const best = history.length ? Math.max(...history.map((h) => h.score)) : null;
  const avg = history.length
    ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length)
    : null;
  const longest = history.reduce((a, h) => (h.longest.length > a.length ? h.longest : a), "");
  const recent = history.slice(-8);
  const maxScore = Math.max(...recent.map((h) => h.score), 1);

  function handleReset() {
    setConfirming(false);
    onReset();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: theme.accent }]}>YOUR STATS</Text>
          <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: theme.accent }]}>
            <Text style={{ color: theme.accent, fontSize: 13 }}>✕</Text>
          </Pressable>
        </View>

        <Row label="Best score" value={best ?? "—"} theme={theme} />
        <Row label="Games played" value={history.length} theme={theme} />
        <Row label="Average score" value={avg ?? "—"} theme={theme} />
        <Row label="Longest word" value={longest || "—"} theme={theme} last />

        <View style={styles.sparkline}>
          {recent.map((h, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: Math.max(6, (h.score / maxScore) * 44),
                backgroundColor: theme.accentBright,
                borderRadius: 2,
                marginHorizontal: 2,
              }}
            />
          ))}
        </View>
        <Text style={[styles.sparkLabel, { color: theme.inkSoft }]}>Last games, by score</Text>

        {!confirming ? (
          <Pressable onPress={() => setConfirming(true)}>
            <Text style={[styles.resetLink, { color: theme.inkSoft }]}>Reset stats</Text>
          </Pressable>
        ) : (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: theme.alert, fontSize: 12.5, marginBottom: 8 }}>
              Clear all saved history? This can't be undone.
            </Text>
            <View style={{ flexDirection: "row" }}>
              <Pressable
                onPress={handleReset}
                style={[styles.confirmBtn, { borderColor: theme.alert, marginRight: 8 }]}
              >
                <Text style={{ color: theme.alert, fontSize: 12 }}>Yes, reset</Text>
              </Pressable>
              <Pressable onPress={() => setConfirming(false)} style={[styles.confirmBtn, { borderColor: theme.rule }]}>
                <Text style={{ color: theme.inkSoft, fontSize: 12 }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text style={[styles.footer, { color: theme.inkSoft, borderTopColor: theme.rule }]}>
          Nobody's Business — <Text style={{ fontFamily: "LibreFranklin_700Bold" }}>never ads. always private.</Text>{"  "}
          {/* The build, which this app was the only one in the line missing.
              Letter Tangle prints it in exactly this spot; Letter Grid defined
              the footer and then never put the number in it, so the one app you
              could not identify by looking at it was the one whose handoff row
              said v18. A version you cannot read cannot answer the question it
              exists to answer. */}
          <Text style={{ fontSize: 9, opacity: 0.55 }}>v20</Text>
        </Text>
        {/* The music credit that stood here is gone with the track it
            credited. Attribution outlives the asset if nobody checks, and a
            credit for something the app no longer contains is a small untruth
            sitting directly beneath a promise. */}
      </View>
    </Modal>
  );
}

function Row({ label, value, theme, last }: { label: string; value: string | number; theme: Theme; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.rule }]}>
      <Text style={{ color: theme.inkSoft, fontSize: 13, fontFamily: "LibreFranklin_400Regular" }}>{label}</Text>
      <Text style={{ color: theme.ink, fontSize: 15, fontFamily: "JetBrainsMono_600SemiBold" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 32,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 8,
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  title: { fontSize: 12, fontFamily: "LibreFranklin_700Bold", letterSpacing: 1.2 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9 },
  sparkline: { flexDirection: "row", alignItems: "flex-end", height: 44, marginTop: 16, marginBottom: 6 },
  sparkLabel: { fontSize: 11, fontFamily: "LibreFranklin_400Regular", letterSpacing: 0.3 },
  resetLink: { fontSize: 12, marginTop: 18, textDecorationLine: "underline", fontFamily: "LibreFranklin_400Regular" },
  footer: {
    fontFamily: "LibreFranklin_400Regular",
    fontSize: 10.5,
    textAlign: "center",
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    letterSpacing: 0.2,
  },
  confirmBtn: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 11, paddingVertical: 5 },
});
