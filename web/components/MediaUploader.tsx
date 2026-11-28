"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_PHOTOS,
  MAX_VIDEO_MB,
  MIN_PHOTOS,
  MIN_VIDEO_SECONDS,
  compressPhoto,
  createManifest,
  upload,
  videoDuration,
} from "@/lib/media";

type Photo = { id: string; preview: string; progress: number; key?: string; error?: string };
type Video = { name: string; preview: string; seconds: number; progress: number; key?: string; error?: string };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Collects ≥3 photos and one ≥60 s video, uploads them, and reports a listing uri ("media:<id>")
 * through onChange once everything is saved. Reports null while anything is missing.
 */
export default function MediaUploader({
  rules,
  phone,
  tgToken,
  onChange,
}: {
  /** Cleaned house rules / phone — empty string while invalid. The listing is only saved when both are valid. */
  rules: string;
  phone: string;
  /** Token proving `phone` was verified via Telegram — empty until then. */
  tgToken: string;
  onChange: (uri: string | null) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [video, setVideo] = useState<Video | null>(null);
  const [videoErr, setVideoErr] = useState("");
  const [photoErr, setPhotoErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [ready, setReady] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const keys = photos.filter((p) => p.key).map((p) => p.key!);
  const videoKey = video?.key;
  const signature = keys.length >= MIN_PHOTOS && videoKey && rules && phone && tgToken ? `${keys.join(",")}|${videoKey}|${rules}|${phone}|${tgToken}` : "";

  useEffect(() => {
    onChange(null);
    setReady(false);
    setSaveErr("");
    if (!signature || !video) return;
    let live = true;
    setSaving(true);
    // Wait for the host to stop typing before saving.
    const t = setTimeout(() => {
      createManifest(keys, videoKey!, video.seconds, rules, phone, tgToken)
        .then((id) => {
          if (!live) return;
          setReady(true);
          onChange(`media:${id}`);
        })
        .catch((e) => live && setSaveErr(e.message))
        .finally(() => live && setSaving(false));
    }, 800);
    return () => {
      live = false;
      clearTimeout(t);
      setSaving(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotoErr("");
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (files.length > room) setPhotoErr(`You can add up to ${MAX_PHOTOS} photos.`);
    for (const file of picked) {
      const id = crypto.randomUUID();
      try {
        const blob = await compressPhoto(file);
        const preview = URL.createObjectURL(blob);
        setPhotos((p) => [...p, { id, preview, progress: 0 }]);
        upload("photo", blob, (pr) => setPhotos((p) => p.map((x) => (x.id === id ? { ...x, progress: pr } : x))))
          .then((key) => setPhotos((p) => p.map((x) => (x.id === id ? { ...x, key, progress: 1 } : x))))
          .catch((e) => setPhotos((p) => p.map((x) => (x.id === id ? { ...x, error: e.message } : x))));
      } catch (e) {
        setPhotoErr(e instanceof Error ? e.message : "Could not add photo");
      }
    }
    if (photoInput.current) photoInput.current.value = "";
  }

  async function addVideo(files: FileList | null) {
    const file = files?.[0];
    if (videoInput.current) videoInput.current.value = "";
    if (!file) return;
    setVideoErr("");
    if (file.size > MAX_VIDEO_MB * 1048576) {
      setVideoErr(`That video is ${Math.round(file.size / 1048576)} MB. The limit is ${MAX_VIDEO_MB} MB — record at 720p or trim it.`);
      return;
    }
    let seconds: number;
    try {
      seconds = await videoDuration(file);
    } catch (e) {
      setVideoErr(e instanceof Error ? e.message : "Can't read this video");
      return;
    }
    if (!(seconds >= MIN_VIDEO_SECONDS - 0.5)) {
      setVideoErr(`Your video is ${fmt(seconds)}. It must be at least ${MIN_VIDEO_SECONDS}s so guests can see the whole room.`);
      return;
    }
    const preview = URL.createObjectURL(file);
    setVideo({ name: file.name, preview, seconds, progress: 0 });
    upload("video", file, (pr) => setVideo((v) => (v ? { ...v, progress: pr } : v)))
      .then((key) => setVideo((v) => (v ? { ...v, key, progress: 1 } : v)))
      .catch((e) => setVideo((v) => (v ? { ...v, error: e.message } : v)));
  }

  const photoCount = keys.length;
  const okPhotos = photoCount >= MIN_PHOTOS;

  return (
    <div className="mu">
      <div className="mu-sec">
        <div className="mu-title">
          <strong>Photos</strong>
          <span className={okPhotos ? "ok small" : "muted small"}>
            {photoCount}/{MIN_PHOTOS} required{okPhotos ? " ✓" : ""}
          </span>
        </div>
        <div className="mu-grid">
          {photos.map((p) => (
            <div className="mu-thumb" key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" />
              {!p.key && !p.error && <span className="mu-bar" style={{ width: `${p.progress * 100}%` }} />}
              {p.error && <span className="mu-err">Failed</span>}
              <button
                type="button"
                className="mu-x"
                aria-label="Remove photo"
                onClick={() => setPhotos((all) => all.filter((x) => x.id !== p.id))}
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" className="mu-add" onClick={() => photoInput.current?.click()}>
              <span>＋</span>
              Add photos
            </button>
          )}
        </div>
        <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
        {photoErr && <p className="err small">{photoErr}</p>}
      </div>

      <div className="mu-sec">
        <div className="mu-title">
          <strong>Room video</strong>
          <span className={videoKey ? "ok small" : "muted small"}>
            min {`${MIN_VIDEO_SECONDS}s`}{videoKey ? " ✓" : ""}
          </span>
        </div>
        {video ? (
          <div className="mu-video">
            <video src={video.preview} controls playsInline preload="metadata" />
            <div className="row small">
              <span className="muted">
                {video.name} · {fmt(video.seconds)}
              </span>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setVideo(null);
                }}
              >
                Replace
              </button>
            </div>
            {!video.key && !video.error && (
              <div className="mu-track">
                <span style={{ width: `${video.progress * 100}%` }} />
              </div>
            )}
            {video.error && <p className="err small">{video.error}</p>}
          </div>
        ) : (
          <button type="button" className="mu-add mu-addv" onClick={() => videoInput.current?.click()}>
            <span>▶</span>
            Add a walkthrough video (at least 8 seconds)
          </button>
        )}
        <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => addVideo(e.target.files)} />
        {videoErr && <p className="err small">{videoErr}</p>}
        <p className="muted small">Walk through the room, bathroom and entrance. Max {MAX_VIDEO_MB} MB.</p>
      </div>

      <p className={ready ? "ok small" : "muted small"}>
        {saving
          ? "Saving media…"
          : ready
            ? "Everything saved — you can publish."
            : saveErr
              ? ""
              : `To publish: ${MIN_PHOTOS}+ photos, an ${MIN_VIDEO_SECONDS}s+ video, a Telegram-verified phone number and house rules.`}
      </p>
      {saveErr && <p className="err small">{saveErr}</p>}
    </div>
  );
}
