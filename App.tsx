import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";

import { initSfx, play, setSfxEnabled } from "./src/audio/sfx";
import Board from "./src/components/Board";
import FoundWords from "./src/components/FoundWords";
import StatsSheet from "./src/components/StatsSheet";
import { getTheme, Theme, ThemeName } from "./src/theme/theme";
import { isWord } from "./src/data/dictionary";
import {
  generateBoard,
  wordFromPath,
  capitalize,
  scoreForLength,
  sessionScore,
  longestWord,
  GameRecord,
} from "./src/game/game";
import {
  loadHistory,
  saveHistory,
  loadCurrentPuzzle,
  saveCurrentPuzzle,
  loadThemePreference,
  saveThemePreference,
  loadSfx,
  saveSfx,
} from "./src/storage/storage";

function AppInner() {
  // Local subsets, not the packages — see assets/fonts/README.md. The
  // family names are unchanged, so every fontFamily string still resolves.
  const [fontsReady] = useFonts({
    Baloo2_600SemiBold: require("./assets/fonts/Baloo2_600SemiBold.ttf"),
    LibreFranklin_400Regular: require("./assets/fonts/LibreFranklin_400Regular.ttf"),
    LibreFranklin_600SemiBold: require("./assets/fonts/LibreFranklin_600SemiBold.ttf"),
    LibreFranklin_700Bold: require("./assets/fonts/LibreFranklin_700Bold.ttf"),
    JetBrainsMono_400Regular: require("./assets/fonts/JetBrainsMono_400Regular.ttf"),
    JetBrainsMono_600SemiBold: require("./assets/fonts/JetBrainsMono_600SemiBold.ttf"),
  });

  const systemScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const theme = getTheme(themeName);

  const [ready, setReady] = useState(false);

  const [board, setBoard] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [invalidFlash, setInvalidFlash] = useState<number[]>([]);
  const [found, setFound] = useState<Map<string, number>>(new Map());
  // Single readout line, exactly like the web build: shows the capitalized
  // in-progress word, or a full feedback sentence after a submit. Feedback
  // sentences render in the soft ink color; the in-progress word in full ink.
  const [readout, setReadout] = useState<{ text: string; muted: boolean }>({
    text: "",
    muted: false,
  });

  const [history, setHistory] = useState<GameRecord[]>([]);
  const [statsVisible, setStatsVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  // True while a finger is tracing across the board; locks page scrolling.
  const [tracing, setTracing] = useState(false);

  // Effects: on by default and remembered. The 4.9 MB ambient track this
  // replaced was off by default and forgotten on every launch.
  const [soundOn, setSoundOn] = useState(true);

  // ---------- boot ----------
  useEffect(() => {
    (async () => {

      const [savedTheme, savedHistory, savedCurrent, savedSfx] = await Promise.all([
        loadThemePreference(),
        loadHistory(),
        loadCurrentPuzzle(),
        loadSfx(),
      ]);

      setSoundOn(savedSfx);
      initSfx(savedSfx);

      setThemeName(savedTheme === "dark" || savedTheme === "light" ? (savedTheme as ThemeName) : systemScheme === "dark" ? "dark" : "light");
      setHistory(savedHistory);

      if (savedCurrent && Array.isArray(savedCurrent.board) && savedCurrent.board.length === 25) {
        setBoard(savedCurrent.board);
        setFound(new Map(savedCurrent.found || []));
      } else {
        const fresh = generateBoard();
        setBoard(fresh);
        saveCurrentPuzzle({ board: fresh, found: [] });
      }

      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- selection / word building ----------
  function handleSelectionChange(path: number[]) {
    // Only as the trace GROWS. Dragging back over your own path to undo a
    // letter is a correction, and corrections should not tick.
    if (path.length > selectedPath.length) play("tap");
    setSelectedPath(path);
    setReadout({ text: capitalize(wordFromPath(board, path)), muted: false });
  }

  function handleInvalidTap(index: number) {
    play("nope");
    setInvalidFlash([index]);
    setTimeout(() => setInvalidFlash([]), 320);
  }

  function clearSelection(displayText?: string) {
    setSelectedPath([]);
    setReadout({ text: displayText ?? "", muted: displayText !== undefined });
  }

  function submitPath(path: number[]) {
    const w = wordFromPath(board, path);
    const Word = capitalize(w);
    if (w.length < 3) {
      // Too short is not a wrong answer, it is an unfinished one. Silent.
      setReadout({ text: "Words need at least 3 letters.", muted: true });
      return;
    }
    if (found.has(w)) {
      play("nope");
      clearSelection(`${Word} has already been found.`);
      return;
    }
    if (!isWord(w)) {
      play("nope");
      setInvalidFlash(path);
      setTimeout(() => setInvalidFlash([]), 320);
      clearSelection(`${Word} is not in the dictionary.`);
      return;
    }
    const next = new Map(found);
    next.set(w, scoreForLength(w.length));
    play("found");
    setFound(next);
    clearSelection(`${Word} has been found.`);
    saveCurrentPuzzle({ board, found: [...next.entries()] });
  }

  function submitWord() {
    submitPath(selectedPath);
  }

  // Lifting a trace auto-submits the word; traces shorter than a real word
  // keep their selection so a stray touch never wipes progress.
  function handleTraceEnd(path: number[]) {
    if (path.length >= 3) submitPath(path);
  }

  function removeFoundWord(w: string) {
    const next = new Map(found);
    next.delete(w);
    setFound(next);
    saveCurrentPuzzle({ board, found: [...next.entries()] });
  }

  async function startNewPuzzle() {
    if (found.size > 0) {
      const record: GameRecord = {
        date: Date.now(),
        score: sessionScore(found),
        words: found.size,
        longest: longestWord(found),
      };
      const nextHistory = [...history, record];
      setHistory(nextHistory);
      await saveHistory(nextHistory);
    }
    const fresh = generateBoard();
    play("deal");
    setBoard(fresh);
    setFound(new Map());
    clearSelection();
    await saveCurrentPuzzle({ board: fresh, found: [] });
  }

  // Only interrupt with a confirm dialog when there's progress to lose;
  // an untouched board just deals a new one.
  function requestNewPuzzle() {
    if (found.size === 0) {
      startNewPuzzle();
      return;
    }
    setConfirmVisible(true);
  }

  function toggleSound() {
    const on = !soundOn;
    setSoundOn(on);
    setSfxEnabled(on);
    saveSfx(on);
    if (on) play("tap");
  }

  async function toggleTheme() {
    const next: ThemeName = themeName === "dark" ? "light" : "dark";
    setThemeName(next);
    await saveThemePreference(next);
  }

  async function resetStats() {
    setHistory([]);
    await saveHistory([]);
  }

  const styles = useMemo(() => makeStyles(theme), [theme]);
  const canSubmit = selectedPath.length >= 3;
  const canClear = selectedPath.length > 0;

  if (!fontsReady || !ready) {
    return (
      <SafeAreaView style={[styles.loadingScreen]}>
        <Text style={[styles.loadingText, { color: theme.accent }]}>Loading the dictionary…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={!tracing}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>LoFi Letter Grid</Text>
          <View style={styles.iconRow}>
            <Pressable
              onPress={() => setStatsVisible(true)}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="View stats"
            >
              <View style={styles.statsIcon}>
                <View style={[styles.statsBar, { height: 7, backgroundColor: theme.accent }]} />
                <View style={[styles.statsBar, { height: 13, backgroundColor: theme.accent }]} />
                <View style={[styles.statsBar, { height: 10, backgroundColor: theme.accent }]} />
              </View>
            </Pressable>
            <Pressable
              onPress={toggleSound}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Toggle ambient sound"
            >
              {/* Same beamed two-note icon as the web build, slash when muted */}
              <Svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                stroke={theme.accent}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M9 18V5l12-2v13" />
                <Circle cx={6} cy={18} r={3} />
                <Circle cx={18} cy={16} r={3} />
                {!soundOn && <Line x1={3} y1={3} x2={21} y2={21} />}
              </Svg>
            </Pressable>
            <Pressable onPress={toggleTheme} style={styles.iconBtn}>
              {/* Both theme glyphs are drawn SVG — text glyphs render at
                  unpredictable sizes and baselines on Android. */}
              {themeName === "dark" ? (
                // key + explicit per-element props: react-native-svg recycles
                // native nodes between the two glyphs and resets absent props
                // to SVG defaults (fill: black), which blacked out the sun.
                <Svg key="sun" viewBox="0 0 24 24" width={20} height={20}>
                  <Circle cx={12} cy={12} r={4.5} stroke={theme.accent} strokeWidth={1.8} fill="none" />
                  <Line x1={12} y1={1.5} x2={12} y2={3.5} stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" />
                  <Line x1={12} y1={20.5} x2={12} y2={22.5} stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" />
                  <Line x1={1.5} y1={12} x2={3.5} y2={12} stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" />
                  <Line x1={20.5} y1={12} x2={22.5} y2={12} stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" />
                  <Line x1={4.6} y1={4.6} x2={6} y2={6} stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" />
                  <Line x1={18} y1={18} x2={19.4} y2={19.4} stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" />
                  <Line x1={4.6} y1={19.4} x2={6} y2={18} stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" />
                  <Line x1={18} y1={6} x2={19.4} y2={4.6} stroke={theme.accent} strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
              ) : (
                <Svg key="moon" viewBox="0 0 24 24" width={20} height={20}>
                  <Circle cx={12} cy={12} r={9} stroke={theme.accent} strokeWidth={1.8} fill="none" />
                  <Path d="M12 3 a9 9 0 0 0 0 18 Z" fill={theme.accent} />
                </Svg>
              )}
            </Pressable>
          </View>
        </View>
        <Text style={styles.tagline}>
          Untimed, solo,{" "}
          <Text style={{ color: theme.accent, fontFamily: "LibreFranklin_600SemiBold" }}>
            at your own pace
          </Text>
          .
        </Text>
        <Pressable onPress={requestNewPuzzle} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>New Puzzle</Text>
        </Pressable>

        <Board
          board={board}
          selectedPath={selectedPath}
          invalidFlash={invalidFlash}
          theme={theme}
          onSelectionChange={handleSelectionChange}
          onInvalidTap={handleInvalidTap}
          onTraceEnd={handleTraceEnd}
          onTraceActiveChange={setTracing}
        />

        <View style={styles.readout}>
          <Text style={[styles.readoutWord, readout.muted && { color: theme.inkSoft }]}>
            {readout.text}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={() => clearSelection()}
            disabled={!canClear}
            style={[styles.ghostBtn, !canClear && styles.ghostBtnDisabled]}
          >
            <Text style={[styles.ghostBtnText, !canClear && { opacity: 0.35 }]}>Clear</Text>
          </Pressable>
          <Pressable
            onPress={submitWord}
            disabled={!canSubmit}
            style={[styles.ghostBtn, !canSubmit && styles.ghostBtnDisabled]}
          >
            <Text style={[styles.ghostBtnText, !canSubmit && { opacity: 0.35 }]}>Submit</Text>
          </Pressable>
        </View>

        <Text style={styles.sessionLine}>
          This game: <Text style={styles.sessionStrong}>{found.size}</Text> words found
        </Text>

        <FoundWords found={found} theme={theme} onRemove={removeFoundWord} />
      </ScrollView>

      <StatsSheet
        visible={statsVisible}
        onClose={() => setStatsVisible(false)}
        history={history}
        theme={theme}
        onReset={resetStats}
      />

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmVisible(false)} />
          <View style={styles.confirmDialog}>
            <Text style={styles.confirmText}>
              Do you want to abandon this game and start a new one? Your progress will be added to
              your stats.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                setConfirmVisible(false);
                startNewPuzzle();
              }}
            >
              <Text style={styles.primaryBtnText}>Start new puzzle</Text>
            </Pressable>
            <Pressable style={styles.confirmGhostBtn} onPress={() => setConfirmVisible(false)}>
              <Text style={styles.confirmGhostText}>Keep playing</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    loadingScreen: { flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" },
    loadingText: { marginTop: 12, fontFamily: "Baloo2_600SemiBold", fontSize: 16 },
    scrollContent: { padding: 18, paddingBottom: 48 },
    headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { fontFamily: "Baloo2_600SemiBold", fontSize: 24, color: theme.accentDeep },
    iconRow: { flexDirection: "row" },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1.5,
      borderColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },
    iconBtnText: { fontSize: 15 },
    statsIcon: { flexDirection: "row", alignItems: "flex-end", columnGap: 2 },
    statsBar: { width: 3, borderRadius: 1 },
    tagline: { fontFamily: "LibreFranklin_400Regular", fontSize: 12.5, color: theme.inkSoft, marginTop: 6, marginBottom: 14 },
    primaryBtn: { backgroundColor: theme.accent, borderRadius: 9, paddingVertical: 13, alignItems: "center" },
    primaryBtnText: { fontFamily: "LibreFranklin_600SemiBold", color: theme.surface, fontSize: 14.5 },
    readout: {
      marginTop: 16,
      minHeight: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    readoutWord: {
      fontFamily: "Baloo2_600SemiBold",
      fontSize: 19,
      color: theme.ink,
      letterSpacing: 0.4,
      textAlign: "center",
    },
    controls: { flexDirection: "row", marginTop: 10 },
    ghostBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: theme.accent,
      borderRadius: 9,
      paddingVertical: 11,
      alignItems: "center",
      marginHorizontal: 4,
    },
    ghostBtnDisabled: { opacity: 0.6 },
    ghostBtnText: { fontFamily: "LibreFranklin_600SemiBold", color: theme.accent, fontSize: 14 },
    sessionLine: {
      fontFamily: "LibreFranklin_400Regular",
      fontSize: 12.5,
      color: theme.inkSoft,
      textAlign: "center",
      marginTop: 14,
    },
    sessionStrong: { fontFamily: "JetBrainsMono_600SemiBold", color: theme.accentDeep, fontSize: 14 },
    confirmOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
    confirmBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
    confirmDialog: {
      maxWidth: 360,
      width: "90%",
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 20,
      gap: 8,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius: 30,
      elevation: 8,
    },
    confirmText: {
      fontFamily: "LibreFranklin_400Regular",
      fontSize: 14,
      lineHeight: 21,
      color: theme.ink,
      marginBottom: 8,
    },
    confirmGhostBtn: {
      borderWidth: 1.5,
      borderColor: theme.rule,
      borderRadius: 9,
      paddingVertical: 11,
      alignItems: "center",
    },
    confirmGhostText: { fontFamily: "LibreFranklin_600SemiBold", fontSize: 13.5, color: theme.inkSoft },
  });
}
