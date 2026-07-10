import React, { useEffect, useRef, useState } from 'react';

const SEGMENT_GAP_MS = 700;

/**
 * Plays an ordered list of audio clips as one continuous track.
 * locked = exam mode: starts automatically, no pause/replay controls.
 * Unlocked = study mode: manual play with replay allowed.
 * Remount (via key) to reset for a new group.
 */
const ListeningPlayer = ({ sources, locked = false, autoPlay = false, onFinished }) => {
  const audioRef = useRef(null);
  const gapTimerRef = useRef(null);
  const [segmentIndex, setSegmentIndex] = useState(autoPlay ? 0 : -1);
  const [isFinished, setIsFinished] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const totalSegments = sources.length;

  useEffect(() => {
    if (segmentIndex < 0 || segmentIndex >= totalSegments) return undefined;

    const audio = new Audio(sources[segmentIndex]);
    audioRef.current = audio;
    audio.onended = () => {
      if (segmentIndex + 1 < totalSegments) {
        gapTimerRef.current = window.setTimeout(
          () => setSegmentIndex(segmentIndex + 1),
          SEGMENT_GAP_MS,
        );
      } else {
        setIsFinished(true);
        setSegmentIndex(-1);
        if (onFinished) onFinished();
      }
    };
    audio.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));

    return () => {
      audio.onended = null;
      audio.pause();
      if (gapTimerRef.current) window.clearTimeout(gapTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex]);

  const startPlayback = () => {
    setIsFinished(false);
    setNeedsTap(false);
    if (segmentIndex === 0) {
      audioRef.current?.play().catch(() => setNeedsTap(true));
    } else {
      setSegmentIndex(0);
    }
  };

  const isPlaying = segmentIndex >= 0;
  const status = needsTap
    ? 'Tap play to start the audio'
    : isPlaying
      ? `Playing audio · ${segmentIndex + 1} / ${totalSegments}`
      : isFinished
        ? 'Audio complete'
        : 'Audio ready';

  return (
    <div className="english-player" role="group" aria-label="Listening audio player">
      <span className={`english-player-status${isPlaying && !needsTap ? ' playing' : ''}`}>
        {status}
      </span>
      {needsTap ? (
        <button type="button" onClick={startPlayback}>
          ▶ Play
        </button>
      ) : !locked && !isPlaying ? (
        <button type="button" onClick={startPlayback}>
          {isFinished ? '↻ Replay' : '▶ Play'}
        </button>
      ) : null}
      {locked && !isPlaying && !isFinished && !needsTap ? (
        <span className="english-player-note">The recording plays once and cannot be paused.</span>
      ) : null}
    </div>
  );
};

export default ListeningPlayer;
