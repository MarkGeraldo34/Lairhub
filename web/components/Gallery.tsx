"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Media } from "@/lib/media";

const PHOTO_MS = 3500;
const VIDEO_MAX_MS = 9000;
const TOUCH_PAUSE_MS = 10000;

/**
 * Photos then the room-tour video, sliding sideways on their own. Pauses while hovered, touched or
 * off-screen; the video plays muted when its turn comes, and a tap on it hands control to the guest.
 */
export default function Gallery({ media, title }: { media: Media; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pausedUntil, setPausedUntil] = useState(0);
  const [stopped, setStopped] = useState(false); // guest took over the video
  const [reduce, setReduce] = useState(true);
  const count = media.photos.length + 1;
  const videoIndex = media.photos.length;

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const goTo = useCallback((i: number) => {
    const s = scroller.current;
    if (s) s.scrollTo({ left: i * s.clientWidth, behavior: "smooth" });
  }, []);

  // Track which slide is showing (also follows the guest's own swipes).
  useEffect(() => {
    const s = scroller.current;
    if (!s) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setIndex(Math.round(s.scrollLeft / Math.max(s.clientWidth, 1))));
    };
    s.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      s.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const active = !reduce && visible && !hover && !stopped && Date.now() >= pausedUntil;

  // Play the video (muted) while its slide is showing; stop it when we move away.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (index === videoIndex && active) {
      v.currentTime = 0;
      v.play().catch(() => undefined);
    } else if (index !== videoIndex) {
      v.pause();
    }
  }, [index, active, videoIndex]);

  // Advance to the next slide after a pause; a touch pause re-arms itself when it runs out.
  useEffect(() => {
    if (reduce || !visible || hover || stopped) return;
    const wait = Math.max(pausedUntil - Date.now(), 0);
    const onVideo = index === videoIndex;
    const next = () => goTo((index + 1) % count);
    const t = setTimeout(next, wait + (onVideo ? VIDEO_MAX_MS : PHOTO_MS));
    const v = video.current;
    const ended = () => {
      clearTimeout(t);
      setTimeout(next, 600);
    };
    if (onVideo) v?.addEventListener("ended", ended);
    return () => {
      clearTimeout(t);
      if (onVideo) v?.removeEventListener("ended", ended);
    };
  }, [index, visible, hover, stopped, pausedUntil, reduce, count, videoIndex, goTo]);

  return (
    <div
      className="gal-wrap"
      ref={box}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
      onPointerDown={(e) => e.pointerType !== "mouse" && setPausedUntil(Date.now() + TOUCH_PAUSE_MS)}
      aria-roledescription="carousel"
      aria-label={`${title} photos and video`}
    >
      <div className="gal" ref={scroller}>
        {media.photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src + i}
            src={src}
            alt={`${title} photo ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className="gal-s"
            draggable={false}
          />
        ))}
        <div className="gal-s gal-v">
          <video
            ref={video}
            src={media.video}
            controls
            muted
            playsInline
            preload="metadata"
            poster={media.photos[0]}
            onPointerDown={() => setStopped(true)}
          />
          <span className="gal-tag">
            Room tour · {Math.floor(media.videoSeconds / 60)}:{String(media.videoSeconds % 60).padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="gal-dots" role="tablist" aria-label="Choose photo">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={i === videoIndex ? "Room tour video" : `Photo ${i + 1}`}
            className={i === index ? "gal-dot on" : "gal-dot"}
            onClick={() => {
              setStopped(false);
              setPausedUntil(Date.now() + TOUCH_PAUSE_MS);
              goTo(i);
            }}
          />
        ))}
      </div>
    </div>
  );
}
