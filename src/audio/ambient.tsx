import React, { useEffect } from "react";
import { useAudioPlayer } from "expo-audio";

/**
 * The ambient bed, built to run as several loops at once.
 *
 * Each layer loops on its own clock. Give them lengths that share no factors —
 * 43, 61 and 79 seconds, say — and the combination doesn't come back around
 * for 43 × 61 × 79 seconds, which is a bit over two days. Nobody hears the
 * same overlap twice, which is the whole reason a short loop stops grating.
 *
 * To switch from one track to three: drop the files in assets/ and list them
 * here. Nothing else changes — the player already handles any number of
 * layers, and three short loops weigh far less than one long track.
 *
 *   export const AMBIENT_LAYERS = [
 *     { source: require("../../assets/ambient-piano.mp3"), volume: 0.34 },
 *     { source: require("../../assets/ambient-pad.mp3"), volume: 0.30 },
 *     { source: require("../../assets/ambient-voices.mp3"), volume: 0.22 },
 *   ];
 */
export const AMBIENT_LAYERS: { source: number; volume: number }[] = [
  { source: require("../../assets/ambient.mp3"), volume: 0.35 },
];

function AmbientLayer({
  source,
  volume,
  playing,
}: {
  source: number;
  volume: number;
  playing: boolean;
}) {
  const player = useAudioPlayer(source);

  useEffect(() => {
    player.loop = true;
    player.volume = volume;
  }, [player, volume]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  return null;
}

/** Renders one looping player per layer; they drift apart, which is the point. */
export default function Ambient({ playing }: { playing: boolean }) {
  return (
    <>
      {AMBIENT_LAYERS.map((layer, i) => (
        <AmbientLayer
          key={i}
          source={layer.source}
          volume={layer.volume}
          playing={playing}
        />
      ))}
    </>
  );
}
