import React from "react";
import { Pressable, Text, View, StyleSheet, LayoutChangeEvent } from "react-native";
import { Theme } from "../theme/theme";

interface TileProps {
  letter: string;
  index: number;
  state: "idle" | "selected" | "active" | "invalid";
  theme: Theme;
  size: number;
  onPress: (index: number) => void;
  onLayout: (index: number, x: number, y: number, size: number) => void;
}

export default function Tile({ letter, index, state, theme, size, onPress, onLayout }: TileProps) {
  const isQu = letter === "Qu";

  const backgroundColor =
    state === "active" ? theme.accentBright : state === "selected" ? theme.accentSoft : theme.tileBg;
  const textColor = state === "active" ? theme.onAccent : theme.ink;
  const borderColor = state === "invalid" ? theme.alert : theme.rule;

  function handleLayout(e: LayoutChangeEvent) {
    const { x, y, width } = e.nativeEvent.layout;
    onLayout(index, x, y, width);
  }

  return (
    <Pressable
      onPress={() => onPress(index)}
      onLayout={handleLayout}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor,
          borderColor,
        },
      ]}
    >
      {isQu ? (
        <View style={styles.quRow}>
          <Text style={[styles.letter, { color: textColor, fontSize: size * 0.4 }]}>Q</Text>
          <Text style={[styles.letter, styles.quTail, { color: textColor, fontSize: size * 0.24 }]}>u</Text>
        </View>
      ) : (
        <Text style={[styles.letter, { color: textColor, fontSize: size * 0.46 }]}>{letter}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    fontFamily: "Fraunces_600SemiBold",
  },
  quRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  quTail: {
    marginLeft: 1,
    marginBottom: 2,
  },
});
