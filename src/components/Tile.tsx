import React, { useEffect, useRef } from "react";
import { Pressable, Text, View, StyleSheet, Animated } from "react-native";
import { Theme } from "../theme/theme";

interface TileProps {
  letter: string;
  index: number;
  state: "idle" | "selected" | "active" | "invalid";
  theme: Theme;
  size: number;
  onPress: (index: number) => void;
}

export default function Tile({ letter, index, state, theme, size, onPress }: TileProps) {
  const isQu = letter === "Qu";
  const shake = useRef(new Animated.Value(0)).current;

  // Same shake the web build plays on an invalid tap.
  useEffect(() => {
    if (state !== "invalid") return;
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: -4, duration: 80, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 4, duration: 160, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [state, shake]);

  const backgroundColor =
    state === "active" ? theme.accentBright : state === "selected" ? theme.accentSoft : theme.tileBg;
  const textColor = state === "active" ? theme.onAccent : theme.ink;
  // Web tiles sit on a hard 2px bottom shadow; selected/active tiles switch it
  // to the bright accent. The border itself never changes.
  const underEdge = state === "selected" || state === "active" ? theme.accentBright : theme.rule;

  return (
    <Animated.View style={{ transform: [{ translateX: shake }] }}>
      <Pressable
        onPress={() => onPress(index)}
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            backgroundColor,
            borderColor: theme.rule,
            boxShadow: `0 2 0 ${underEdge}`,
          },
        ]}
      >
        {isQu ? (
          <View style={styles.quRow}>
            <Text style={[styles.letter, { color: textColor, fontSize: size * 0.42 }]}>Q</Text>
            <Text style={[styles.letter, styles.quTail, { color: textColor, fontSize: size * 0.25 }]}>u</Text>
          </View>
        ) : (
          <Text style={[styles.letter, { color: textColor, fontSize: size * 0.42 }]}>{letter}</Text>
        )}
      </Pressable>
    </Animated.View>
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
    fontFamily: "Baloo2_600SemiBold",
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
