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
import { useAudioPlayer } from "expo-audio";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts as useBaloo, Baloo2_600SemiBold } from "@expo-google-fonts/baloo-2";
import {
  useFonts as useLibreFranklin,
  LibreFranklin_400Regular,
  LibreFranklin_600SemiBold,
  LibreFranklin_700Bold,
} from "@expo-google-fonts/libre-franklin";
import {
  useFonts as useJetBrainsMono,
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";

import Board from "./src/components/Board";
import FoundWords from "./src/components/FoundWords";
import StatsSheet from "./src/components/StatsSheet";
import { getTheme, Theme, ThemeName } from "./src/theme/theme";
import { loadDictionary } from "./src/data/dictionary";
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
} from "./src/storage/storage";

function AppInner() {
  const [balooLoaded] = useBaloo({ Baloo2_600SemiBold });
  const [libreLoaded] = useLibreFranklin({
    LibreFranklin_400Regular,
    LibreFranklin_600SemiBold,
    LibreFranklin_700Bold,
  });
  const [monoLoaded] = useJetBrainsMono({ JetBrainsMono_400Regular, JetBrainsMono_600SemiBold });
  const fontsReady = balooLoaded && libreLoaded && monoLoaded;

  const systemScheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const theme = getTheme(themeName);

  const [ready, setReady] = useState(false);
  const dictRef = useRef<Set<string> | null>(null);

  const [board, setBoard] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [invalidFlash, setInvalidFlash] = useState<number[]>([]);
  const [found, setFound] = useState<Map<string, number>>(new Map());
  // Single readout line, exactly like the web build: shows the capitalized
  // in-progress word, or a full feedback sentence after a submit.
  const [wordDisplay, setWordDisplay] = useState<string>("");

  const [history, setHistory] = useState<GameRecord[]>([]);
  const [statsVisible, setStatsVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // Ambient sound: off by default, not persisted. The track is a bundled
  // asset and only starts loading into the player when the app boots; no
  // audio plays until the user unmutes.
  const [soundOn, setSoundOn] = useState(false);
  const player = useAudioPlayer(require("./assets/ambient.mp3"));
  useEffect(() => {
    player.loop = true;
    player.volume = 0.35;
  }, [player]);

  // ---------- boot ----------
  useEffect(() => {
    (async () => {
      dictRef.current = loadDictionary();

      const [savedTheme, savedHistory, savedCurrent] = await Promise.all([
        loadThemePreference(),
        loadHistory(),
        loadCurrentPuzzle(),
      ]);

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
    setSelectedPath(path);
    setWordDisplay(capitalize(wordFromPath(board, path)));
  }

  function handleInvalidTap(index: number) {
    setInvalidFlash([index]);
    setTimeout(() => setInvalidFlash([]), 320);
  }

  function clearSelection(keepWord?: string) {
    setSelectedPath([]);
    setWordDisplay(keepWord ?? "");
  }

  function submitWord() {
    if (!dictRef.current) return;
    const w = wordFromPath(board, selectedPath);
    const Word = capitalize(w);
    if (w.length < 3) {
      setWordDisplay("Words need at least 3 letters.");
      return;
    }
    if (found.has(w)) {
      clearSelection(`${Word} has already been found.`);
      return;
    }
    if (!dictRef.current.has(w)) {
      setInvalidFlash(selectedPath);
      setTimeout(() => setInvalidFlash([]), 320);
      clearSelection(`${Word} is not in the dictionary.`);
      return;
    }
    const next = new Map(found);
    next.set(w, scoreForLength(w.length));
    setFound(next);
    clearSelection(`${Word} has been found.`);
    saveCurrentPuzzle({ board, found: [...next.entries()] });
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
    if (soundOn) player.pause();
    else player.play();
    setSoundOn(!soundOn);
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Spelling Grid</Text>
          <View style={styles.iconRow}>
            <Pressable onPress={() => setStatsVisible(true)} style={styles.iconBtn}>
              <Text style={styles.iconBtnText}>📊</Text>
            </Pressable>
            <Pressable
              onPress={toggleSound}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Toggle ambient sound"
            >
              <Text style={[styles.iconBtnText, { color: theme.accent, fontSize: 16 }]}>♪</Text>
              {!soundOn && <View style={[styles.muteSlash, { backgroundColor: theme.accent }]} />}
            </Pressable>
            <Pressable onPress={toggleTheme} style={styles.iconBtn}>
              <Text style={[styles.iconBtnText, { color: theme.accent }]}>{themeName === "dark" ? "☀" : "◐"}</Text>
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
        />

        <View style={styles.readout}>
          <Text style={styles.readoutWord}>{wordDisplay}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={submitWord}
            disabled={!canSubmit}
            style={[styles.ghostBtn, !canSubmit && styles.ghostBtnDisabled]}
          >
            <Text style={[styles.ghostBtnText, !canSubmit && { opacity: 0.35 }]}>Submit</Text>
          </Pressable>
          <Pressable onPress={() => clearSelection()} style={styles.ghostBtn}>
            <Text style={styles.ghostBtnText}>Clear</Text>
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
              Start a new puzzle? This ends your current board. Words you've already found will be
              saved to your stats first.
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
    muteSlash: {
      position: "absolute",
      width: 26,
      height: 1.5,
      transform: [{ rotate: "45deg" }],
    },
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
