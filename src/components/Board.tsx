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
  /** Fired when a board touch starts/stops so the parent can lock scrolling. */
  onTraceActiveChange: (active: boolean) => void;
}

const GAP = 7;
const PADDING = 12;
// Movement below this (px) counts as a tap; above it, a trace.
const TAP_SLOP = 6;
// While tracing, a tile only "catches" the finger within this fraction of its
// size from its center, so brushing a corner during a diagonal move doesn't
// grab the wrong letter. Raise toward 0.5 for grabbier, lower for stricter.
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
  // Gesture bookkeeping. The board claims every touch at touch-down (that is
  // what stops the page's ScrollView from stealing vertical drags on Android),
  // so taps are resolved here too: no movement = tap, movement = trace.
  const gestureMode = useRef<"idle" | "pending" | "trace">("idle");
  const startPoint = useRef({ x: 0, y: 0 });
  // Live path during a drag; null when not tracing. Kept in a ref because
  // pan events arrive faster than state round-trips.
  const tracePath = useRef<number[] | null>(null);
  // Latest callbacks, so the once-created PanResponder never goes stale.
  const cbRef = useRef({ onSelectionChange, onInvalidTap, onTraceEnd, onTraceActiveChange });
  cbRef.current = { onSelectionChange, onInvalidTap, onTraceEnd, onTraceActiveChange };

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

  // ---------- tap selection (same rules as the web build) ----------
  function tapTile(index: number) {
    const path = selectedPathRef.current;
    let next = path.slice();
    const last = next[next.length - 1];
    const secondLast = next[next.length - 2];

    if (next.length === 0) {
      next = [index];
    } else if (index === last) {
      return; // tapping the active tile again does nothing
    } else if (next.length >= 2 && index === secondLast) {
      next.pop(); // step back
    } else if (next.includes(index)) {
      cbRef.current.onInvalidTap(index); // can't reuse a tile mid-word
      return;
    } else if (isAdjacent(index, last)) {
      next.push(index);
    } else {
      cbRef.current.onInvalidTap(index); // not adjacent to the active tile
      return;
    }
    cbRef.current.onSelectionChange(next);
  }

  // ---------- hit testing ----------
  // Taps accept anywhere on the tile square; traces demand the central circle.
  function hitTile(pageX: number, pageY: number, mode: "tap" | "trace"): number | null {
    const t = tileSizeRef.current;
    if (t <= 0) return null;
    const x = pageX - gridOrigin.current.x;
    const y = pageY - gridOrigin.current.y;
    const cell = t + GAP;
    const col = Math.floor(x / cell);
    const row = Math.floor(y / cell);
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return null;
    const lx = x - col * cell;
    const ly = y - row * cell;
    if (mode === "tap") {
      if (lx > t || ly > t) return null; // landed in the gap
    } else {
      const dx = lx - t / 2;
      const dy = ly - t / 2;
      const r = t * HIT_RADIUS;
      if (dx * dx + dy * dy > r * r) return null;
    }
    return row * SIZE + col;
  }

  // ---------- drag-trace selection ----------
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
    const index = hitTile(pageX, pageY, "trace");
    if (index === null) return;
    const path = tracePath.current;
    if (!path) return;
    const last = path[path.length - 1];
    const continues =
      path.length > 0 &&
      (index === last || isAdjacent(index, last)) &&
      !(path.includes(index) && index !== last);
    if (path.length > 0 && !continues) {
      // Not a continuation of the tapped-out selection: start a fresh word here.
      tracePath.current = [index];
      cbRef.current.onSelectionChange([index]);
      return;
    }
    traceHit(index);
  }

  function endTrace() {
    const path = tracePath.current;
    tracePath.current = null;
    if (path) cbRef.current.onTraceEnd([...path]);
  }

  const panResponder = useRef(
    PanResponder.create({
      // Claim in the capture phase, at touch-down. This wins over the tile
      // Pressables AND (crucially) sets Android's disallow-intercept flag so
      // the page ScrollView cannot steal vertical drags mid-trace.
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (_evt, g) => {
        gestureMode.current = "pending";
        startPoint.current = { x: g.x0, y: g.y0 };
        cbRef.current.onTraceActiveChange(true);
        // Re-measure at touch-down — the page may have been scrolled since layout.
        measureGrid();
      },
      onPanResponderMove: (_evt, g) => {
        if (gestureMode.current === "pending") {
          if (Math.abs(g.dx) + Math.abs(g.dy) <= TAP_SLOP) return;
          gestureMode.current = "trace";
          tracePath.current = [...selectedPathRef.current];
          startTraceAt(startPoint.current.x, startPoint.current.y);
        }
        if (gestureMode.current === "trace") {
          const index = hitTile(g.moveX, g.moveY, "trace");
          if (index !== null) traceHit(index);
        }
      },
      onPanResponderRelease: () => {
        const mode = gestureMode.current;
        gestureMode.current = "idle";
        cbRef.current.onTraceActiveChange(false);
        if (mode === "pending") {
          // Finger never moved: it's a tap.
          const index = hitTile(startPoint.current.x, startPoint.current.y, "tap");
          if (index !== null) tapTile(index);
        } else if (mode === "trace") {
          endTrace();
        }
      },
      onPanResponderTerminate: () => {
        // Something took the gesture (should not happen; incoming call etc.).
        const mode = gestureMode.current;
        gestureMode.current = "idle";
        cbRef.current.onTraceActiveChange(false);
        if (mode === "trace") endTrace();
      },
    })
  ).current;

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
                  onPress={tapTile}
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
