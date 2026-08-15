import React, { useRef, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent, PanResponder } from "react-native";
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
  /** Fired when a drag-trace lifts; receives the final path. */
  onTraceEnd: (path: number[]) => void;
  /** Fired when a trace starts/stops so the parent can lock scrolling. */
  onTraceActiveChange: (active: boolean) => void;
}

const GAP = 7;
const PADDING = 12;
// A tile only "catches" the finger within this fraction of its size from its
// center, so brushing a corner during a diagonal move doesn't grab the wrong
// letter. Raise toward 0.5 to make tracing grabbier, lower to make it stricter.
const HIT_RADIUS = 0.4;

export default function Board({
  board,
  selectedPath,
  invalidFlash,
  theme,
  onSelectionChange,
  onInvalidTap,
  onTraceEnd,
  onTraceActiveChange,
}: BoardProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const gridRef = useRef<View>(null);
  const gridOrigin = useRef({ x: 0, y: 0 });
  const tileSizeRef = useRef(0);
  const selectedPathRef = useRef(selectedPath);
  selectedPathRef.current = selectedPath;
  // Live path during a drag; null when not tracing. Kept in a ref because
  // pan events arrive faster than state round-trips.
  const tracePath = useRef<number[] | null>(null);
  // Latest callbacks, so the once-created PanResponder never goes stale.
  const cbRef = useRef({ onSelectionChange, onTraceEnd, onTraceActiveChange });
  cbRef.current = { onSelectionChange, onTraceEnd, onTraceActiveChange };

  const tileSize = containerWidth > 0 ? (containerWidth - PADDING * 2 - GAP * (SIZE - 1)) / SIZE : 0;
  tileSizeRef.current = tileSize;

  function handleContainerLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    // Cap at a sane max so this doesn't sprawl on a tablet-width screen.
    setContainerWidth(Math.min(w, 480));
  }

  function measureGrid(after?: () => void) {
    gridRef.current?.measureInWindow((x, y) => {
      gridOrigin.current = { x, y };
      after?.();
    });
  }

  // ---------- tap selection (unchanged rules) ----------
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

  // ---------- drag-trace selection ----------
  function hitTile(pageX: number, pageY: number): number | null {
    const t = tileSizeRef.current;
    if (t <= 0) return null;
    const x = pageX - gridOrigin.current.x;
    const y = pageY - gridOrigin.current.y;
    const cell = t + GAP;
    const col = Math.floor(x / cell);
    const row = Math.floor(y / cell);
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return null;
    const dx = x - (col * cell + t / 2);
    const dy = y - (row * cell + t / 2);
    const r = t * HIT_RADIUS;
    if (dx * dx + dy * dy > r * r) return null;
    return row * SIZE + col;
  }

  function traceHit(index: number) {
    const path = tracePath.current;
    if (!path) return;
    const last = path[path.length - 1];
    if (index === last) return;
    if (path.length >= 2 && index === path[path.length - 2]) {
      path.pop(); // sliding back onto the previous tile undoes it
    } else if (path.includes(index)) {
      return; // silently ignore reused tiles mid-trace
    } else if (path.length === 0 || isAdjacent(index, last)) {
      path.push(index);
    } else {
      return; // finger skipped over a non-adjacent tile; ignore
    }
    cbRef.current.onSelectionChange([...path]);
  }

  function startTraceAt(pageX: number, pageY: number) {
    const index = hitTile(pageX, pageY);
    if (index === null) return;
    const path = tracePath.current;
    if (!path) return;
    const last = path[path.length - 1];
    const continues = path.length > 0 && (index === last || isAdjacent(index, last)) && !(path.includes(index) && index !== last);
    if (path.length > 0 && !continues) {
      // Not a continuation of the tapped-out selection: start a fresh word here.
      tracePath.current = [index];
      cbRef.current.onSelectionChange([index]);
      return;
    }
    traceHit(index);
  }

  const panResponder = useRef(
    PanResponder.create({
      // Let plain taps through to the tiles; claim the gesture once the
      // finger actually moves.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
      // Refuse to hand the gesture back to the ScrollView mid-trace.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_evt, g) => {
        cbRef.current.onTraceActiveChange(true);
        tracePath.current = [...selectedPathRef.current];
        // Re-measure at trace start — the page may have been scrolled since layout.
        measureGrid(() => startTraceAt(g.x0, g.y0));
      },
      onPanResponderMove: (_evt, g) => {
        if (!tracePath.current) return;
        const index = hitTile(g.moveX, g.moveY);
        if (index !== null) traceHit(index);
      },
      onPanResponderRelease: () => endTrace(),
      onPanResponderTerminate: () => endTrace(),
    })
  ).current;

  function endTrace() {
    const path = tracePath.current;
    tracePath.current = null;
    cbRef.current.onTraceActiveChange(false);
    if (path) cbRef.current.onTraceEnd([...path]);
  }

  // ---------- rendering ----------
  function tileState(index: number): "idle" | "selected" | "active" | "invalid" {
    if (invalidFlash.includes(index)) return "invalid";
    const pos = selectedPath.indexOf(index);
    if (pos === -1) return "idle";
    if (pos === selectedPath.length - 1) return "active";
    return "selected";
  }

  // Tile centers are derived from the grid geometry directly — layout
  // callbacks report coordinates relative to each tile's wrapper, which is
  // useless for drawing across the whole grid.
  function threadPath(): string {
    if (selectedPath.length < 2 || tileSize <= 0) return "";
    const pts = selectedPath.map((i) => {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      return [c * (tileSize + GAP) + tileSize / 2, r * (tileSize + GAP) + tileSize / 2];
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
        <View
          ref={gridRef}
          onLayout={() => measureGrid()}
          {...panResponder.panHandlers}
          style={{ width: containerWidth - PADDING * 2 }}
        >
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
                />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: 18,
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
