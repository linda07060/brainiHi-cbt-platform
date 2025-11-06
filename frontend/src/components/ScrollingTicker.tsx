import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "../styles/ScrollingTicker.module.css";

export type TickerItem = {
  id?: string;
  text: string;
  link?: string; // optional href
  action?: () => void; // optional JS action
};

type Props = {
  items: TickerItem[];
  speedPxPerSec?: number; // scrolling speed in pixels/sec (default 60)
  sessionKey?: string; // sessionStorage key for "dismiss this session"
  ariaLabel?: string;
  onOpen?: (item: TickerItem) => void;
  onDismiss?: () => void;
};

export default function ScrollingTicker({
  items,
  speedPxPerSec = 60,
  sessionKey = "scrolling_ticker_dismissed_v1",
  ariaLabel = "Site announcements",
  onOpen,
  onDismiss,
}: Props): JSX.Element | null {
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // session dismissal check
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (raw === "1") {
        setVisible(false);
      }
    } catch {}
  }, [sessionKey]);

  // Measure widths and compute animation duration so speed is consistent in px/s.
  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;
    // small delay to ensure fonts/images loaded
    const t = setTimeout(() => {
      try {
        const scroller = scrollerRef.current!;
        // scroller contains duplicated content; measure one copy width
        const firstChild = scroller.querySelector<HTMLElement>("[data-copy='1']");
        const copyWidth = firstChild ? firstChild.getBoundingClientRect().width : scroller.scrollWidth / 2;
        const px = Math.max(100, copyWidth); // avoid too small
        const dur = px / Math.max(10, speedPxPerSec); // seconds = pixels / speed
        setDuration(dur);
        // set CSS variable for animation duration
        if (scroller) {
          scroller.style.setProperty("--scroll-duration", `${dur}s`);
        }
      } catch {
        // ignore
      }
    }, 120);

    // recompute on resize/orientationchange
    const onResize = () => {
      try {
        const scroller = scrollerRef.current!;
        const firstChild = scroller.querySelector<HTMLElement>("[data-copy='1']");
        const copyWidth = firstChild ? firstChild.getBoundingClientRect().width : scroller.scrollWidth / 2;
        const px = Math.max(100, copyWidth);
        const dur = px / Math.max(10, speedPxPerSec);
        setDuration(dur);
        scroller.style.setProperty("--scroll-duration", `${dur}s`);
      } catch {}
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize as EventListener);
      window.removeEventListener("orientationchange", onResize as EventListener);
    };
  }, [items, speedPxPerSec]);

  if (!visible || items.length === 0) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(sessionKey, "1");
    } catch {}
    setVisible(false);
    try { onDismiss?.(); } catch {}
    try { window.dispatchEvent(new CustomEvent("scrolling_ticker_dismissed", { detail: { when: Date.now() } })); } catch {}
  }

  function handleClickItem(item: TickerItem, e?: React.MouseEvent) {
    try {
      if (item.action) {
        e?.preventDefault();
        item.action();
      }
      onOpen?.(item);
    } catch {}
    try { window.dispatchEvent(new CustomEvent("scrolling_ticker_opened", { detail: { id: item.id ?? item.text, when: Date.now() } })); } catch {}
  }

  // Build repeated content (two copies) for seamless loop
  const content = (
    <div className={styles.itemsRow} data-copy="1" aria-hidden="true">
      {items.map((it, idx) => (
        <span key={idx} className={styles.item}>
          <span className={styles.itemText}>{it.text}</span>
          {it.link ? (
            <Link href={it.link} legacyBehavior>
              <a
                className={styles.itemLink}
                onClick={(e) => handleClickItem(it, e)}
              >
                Learn more
              </a>
            </Link>
          ) : it.action ? (
            <button className={styles.itemLink} onClick={(e) => handleClickItem(it, e)}>Learn more</button>
          ) : null}
          <span className={styles.sep} aria-hidden> · </span>
        </span>
      ))}
    </div>
  );

  // duplicate
  const duplicated = (
    <>
      {content}
      <div className={styles.itemsRow} data-copy="2" aria-hidden="true">
        {items.map((it, idx) => (
          <span key={`dup-${idx}`} className={styles.item}>
            <span className={styles.itemText}>{it.text}</span>
            {it.link ? (
              <Link href={it.link} legacyBehavior>
                <a className={styles.itemLink} onClick={(e) => handleClickItem(it, e)}>Learn more</a>
              </Link>
            ) : it.action ? (
              <button className={styles.itemLink} onClick={(e) => handleClickItem(it, e)}>Learn more</button>
            ) : null}
            <span className={styles.sep} aria-hidden> · </span>
          </span>
        ))}
      </div>
    </>
  );

  return (
    <div className={styles.wrapper} role="region" aria-label={ariaLabel}>
      <div className={styles.container}>
        {/* Visually-hidden static copy for screen readers */}
        <div className={styles.srOnly} aria-hidden={false}>
          {items.map((it, i) => (i ? " · " : "") + it.text)}
        </div>

        <div
          className={`${styles.viewport} ${prefersReduced ? styles.static : ""}`}
          ref={containerRef}
          onMouseEnter={() => {
            const sc = scrollerRef.current;
            if (sc && !prefersReduced) sc.classList.add(styles.paused);
          }}
          onMouseLeave={() => {
            const sc = scrollerRef.current;
            if (sc && !prefersReduced) sc.classList.remove(styles.paused);
          }}
        >
          <div
            className={styles.scroller}
            ref={scrollerRef}
            style={prefersReduced ? undefined : { animationDuration: duration ? `${duration}s` : undefined }}
            aria-hidden="true"
          >
            {duplicated}
          </div>
        </div>

        <div className={styles.controls}>
          <button className={styles.dismiss} aria-label="Dismiss announcements for this session" onClick={dismiss}>×</button>
        </div>
      </div>
    </div>
  );
}