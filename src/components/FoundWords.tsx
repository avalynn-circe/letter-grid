import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Theme } from "../theme/theme";

interface FoundWordsProps {
  found: Map<string, number>;
  theme: Theme;
  onRemove: (word: string) => void;
}

export default function FoundWords({ found, theme, onRemove }: FoundWordsProps) {
  const buckets: Record<string, string[]> = { "3": [], "4": [], "5": [], "6+": [] };
  [...found.keys()].sort().forEach((w) => {
    const key = w.length >= 6 ? "6+" : String(w.length);
    buckets[key].push(w);
  });

  return (
    <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.rule }]}>
      <Text style={[styles.heading, { color: theme.accent }]}>FOUND WORDS</Text>
      {Object.entries(buckets).map(([label, words]) => (
        <View key={label} style={styles.group}>
          <View style={styles.groupHead}>
            <Text style={[styles.groupLabel, { color: theme.inkSoft }]}>
              {label}-LETTER{label === "6+" ? "" : " WORDS"}
            </Text>
            <Text style={[styles.groupCount, { color: theme.accent }]}>{words.length}</Text>
          </View>
          {words.length === 0 ? (
            <Text style={[styles.empty, { color: theme.inkSoft }]}>None yet</Text>
          ) : (
            <View style={styles.chipRow}>
              {words.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => onRemove(w)}
                  style={[styles.chip, { backgroundColor: theme.bg, borderColor: theme.rule }]}
                >
                  <Text style={[styles.chipText, { color: theme.ink }]}>{w}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 18,
  },
  heading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  group: { marginBottom: 14 },
  groupHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 },
  groupLabel: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.5 },
  groupCount: { fontSize: 10.5, fontWeight: "700" },
  empty: { fontSize: 12, fontStyle: "italic" },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 5,
    marginBottom: 5,
  },
  chipText: { fontFamily: "JetBrainsMono_400Regular", fontSize: 12 },
});
