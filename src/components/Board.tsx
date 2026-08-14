import React, { useCallback, useRef, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import Tile from "./Tile";
import { SIZE, isAdjacent } from "../game/game";
import { Theme } from "../theme/theme";

interface BoardProps {
  board: string[];
  selectedPath: number[];
  invalidFlash: number[];
  theme: Theme;
  onSelectionChange: (path: number[]) => void;
  onInvalidTap: (index: number) => void;
}

interface TilePos {
  x: number;
  y: number;
  size: number;
}

const GAP = 7;
const PADDING = 12;

export default function Board({ board, selectedPath, invalidFlash, theme, onSelectionChange, onInvalidTap }: BoardProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const positions = useRef<TilePos[]>([]);

  const tileSize = containerWidth > 0 ? (containerWidth - PADDING * 2 - GAP * (SIZE - 1)) / SIZE : 0;

  function handleContainerLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    // Cap at a sane max so this doesn't sprawl on a tablet-width screen.
    setContainerWidth(Math.min(w, 480));
  }

  const handleTileLayout = useCallback((index: number, x: number, y: number, size: number) => {
    positions.current[index] = { x, y, size };
  }, []);

  function handlePress(index: number) {
    let next = selectedPath.slice();
    const last = next[next.length - 1];
    const secondLast = next[next.length - 2];

    if (next.length === 0) {
      next = [index];
    } else if (index === last) {
      return; // tapping the active tile again does nothing
    } else if (next.length >= 2 && index === secondLast) {
      next.pop(); // step back
    } else if (next.includes(index)) {
      onInvalidTap(index); // can't reuse a tile mid-word
      return;
    } else if (isAdjacent(index, last)) {
      next.push(index);
    } else {
      onInvalidTap(index); // not adjacent to the active tile
      return;
    }
    onSelectionChange(next);
  }

  function tileState(index: number): "idle" | "selected" | "active" | "invalid" {
    if (invalidFlash.includes(index)) return "invalid";
    const pos = selectedPath.indexOf(index);
    if (pos === -1) return "idle";
    if (pos === selectedPath.length - 1) return "active";
    return "selected";
  }

  function threadPath(): string {
    if (selectedPath.length < 2) return "";
    const pts = selectedPath.map((i) => {
      const p = positions.current[i];
      if (!p) return [0, 0];
      return [p.x + p.size / 2, p.y + p.size / 2];
    });
    return pts.reduce(
      (acc, p, idx) => acc + (idx === 0 ? `M ${p[0]} ${p[1]}` : ` L ${p[0]} ${p[1]}`),
      ""
    );
  }

  const d = threadPath();

  return (
    <View
      onLayout={handleContainerLayout}
      style={[
        styles.shell,
        { backgroundColor: theme.surface, borderColor: theme.rule, shadowColor: theme.shadow },
      ]}
    >
      {containerWidth > 0 && (
        <View style={{ width: containerWidth - PADDING * 2 }}>
          <View style={styles.grid}>
            {board.map((letter, i) => (
              <View key={i} style={{ marginRight: (i + 1) % SIZE === 0 ? 0 : GAP, marginBottom: GAP }}>
                <Tile
                  letter={letter}
                  index={i}
                  size={tileSize}
                  state={tileState(i)}
                  theme={theme}
                  onPress={handlePress}
                  onLayout={handleTileLayout}
                />
              </View>
            ))}
          </View>
          {!!d && (
            <Svg
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              width={containerWidth - PADDING * 2}
              height={containerWidth - PADDING * 2}
            >
              <Path d={d} stroke={theme.threadShadow} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d={d} stroke={theme.accentBright} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 16,
    borderWidth: 1,
    padding: PADDING,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
