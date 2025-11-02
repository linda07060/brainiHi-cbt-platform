import React, { useEffect, useRef, useState } from "react";
import styles from "../styles/ExamLanding.module.css";

type Props = {
  videoUrl?: string;
  fallbackUrl?: string;
  poster?: string;
  alt?: string;
  // By default we attempt autoplay (muted). Set autoplay={false} to disable.
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
};

export default function DemoVideo({
  videoUrl = "/videos/demo-video.mp4",
  fallbackUrl,
  poster,
  alt = "Demo video",
  autoplay = true,
  controls = false,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attemptedFallback, setAttemptedFallback] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setShowOverlay(false);
    setFailed(false);
    setAttemptedFallback(false);
  }, [videoUrl, fallbackUrl, poster]);

  // Try to start playback programmatically (muted). Retry briefly if necessary.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Always set attributes that increase autoplay success
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.loop = !controls; // loop when in preview mode
    // attempt play only when autoplay requested
    if (!autoplay) {
      // keep poster visible and show overlay play button
      setShowOverlay(true);
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const tryPlay = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        // ensure source is set so browser requests it
        if (v.src === "" && videoUrl) v.src = videoUrl;
        await v.play();
        if (!cancelled) {
          setIsPlaying(true);
          setShowOverlay(false);
        }
      } catch (err) {
        // autoplay likely blocked; show overlay so user can start
        if (attempts < 3) {
          // small backoff and retry
          setTimeout(tryPlay, 120 * attempts);
        } else {
          if (!cancelled) {
            setShowOverlay(true);
            setIsPlaying(false);
          }
        }
      }
    };

    // call load to encourage fetching the resource
    try {
      v.load();
    } catch {}

    // schedule initial attempt shortly after mount
    const id = window.setTimeout(tryPlay, 60);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [autoplay, controls, videoUrl]);

  // Fallback handling for loading errors
  function handleError() {
    if (!attemptedFallback && fallbackUrl) {
      setAttemptedFallback(true);
      if (videoRef.current) {
        videoRef.current.src = fallbackUrl;
        try {
          videoRef.current.load();
          // try auto-play again if autoplay requested
          if (autoplay) {
            videoRef.current.play().catch(() => setShowOverlay(true));
          }
        } catch {}
      }
      return;
    }
    setFailed(true);
  }

  async function handleUserPlay() {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false; // if you want sound on user gesture, unmute; else keep muted
      await v.play();
      setIsPlaying(true);
      setShowOverlay(false);
    } catch {
      // if still fails, keep overlay visible
      setShowOverlay(true);
    }
  }

  // If final failure and poster exists, render poster fallback
  if (failed && poster) {
    return (
      <div className={`${styles.videoWrap} ${className || ""}`}>
        <div className={styles.videoInner} role="img" aria-label={alt}>
          <img src={poster} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.videoWrap} ${className || ""}`}>
      <div className={styles.videoInner} style={{ position: "relative" }}>
        <video
          ref={videoRef}
          poster={poster}
          controls={controls || isPlaying}
          aria-label={alt}
          // keep object-fit controlled by CSS
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000", borderRadius: 8 }}
          onError={handleError}
        >
          {videoUrl && <source src={videoUrl} type="video/mp4" />}
          {fallbackUrl && <source src={fallbackUrl} type="video/mp4" />}
          Your browser does not support the video tag.
        </video>

        {/* Overlay: either a translucent play button or hidden if playing */}
        {showOverlay && (
          <button
            className={styles.playOverlay}
            aria-label="Play demo"
            onClick={handleUserPlay}
            type="button"
            title="Play demo"
          >
            <span className={styles.playButton} aria-hidden="true" />
          </button>
        )}
      </div>

      <div style={{ marginTop: 10, color: "#666", fontSize: "0.95rem" }}>{alt} — short preview of the test flow.</div>
    </div>
  );
}