/* global Hls */
import { ajax } from "discourse/lib/ajax";
import { iconHTML } from "discourse/lib/icon-library";
import loadScript from "discourse/lib/load-script";
import { i18n } from "discourse-i18n";

const HLS_SCRIPT_URL = "/plugins/discourse-video/javascripts/hls.min.js";
const EMBEDS_SELECTOR = "div[data-video-id], div[data-download-video-id]";

const renders = new WeakMap();
const mounted = new WeakMap();

// A render whose data arrives after a newer render started is dropped
function startRender(container) {
  const render = {};
  renders.set(container, render);
  return () => renders.get(container) === render;
}

function mount(container, content, playbackId) {
  mounted.get(container)?.controller.abort();
  const controller = new AbortController();
  mounted.set(container, { controller, playbackId });
  container.replaceChildren(content);
  return controller.signal;
}

export function stopRenders(elem) {
  elem.querySelectorAll(EMBEDS_SELECTOR).forEach((container) => {
    renders.delete(container);
    mounted.get(container)?.controller.abort();
    mounted.delete(container);
  });
}

export function fetchPlayback(videoId) {
  return ajax(`/discourse_video/playback_id/${videoId}`);
}

export async function renderVideo(container, playback) {
  const isLatestRender = startRender(container);

  let data;
  try {
    [data] = await Promise.all([playback, loadScript(HLS_SCRIPT_URL)]);
  } catch {
    // A failed request leaves the embed as it is
    return;
  }

  if (!isLatestRender()) {
    return;
  }

  if (!data.playback_id) {
    renderPlaceholder(container, "pending");
    return;
  }

  // Keeps a playing video going when a re-render leaves it unchanged
  if (mounted.get(container)?.playbackId === data.playback_id) {
    return;
  }

  const video = document.createElement("video");
  video.className = "mux-video";
  video.controls = true;
  // Bounding both sides keeps 1080p portrait videos from being upscaled
  video.poster = `https://image.mux.com/${data.playback_id}/thumbnail.jpg?time=1&width=1280&height=1920`;
  video.setAttribute("playsinline", "");
  const signal = mount(container, video, data.playback_id);

  const hlsUrl = `https://stream.mux.com/${data.playback_id}.m3u8`;

  if (Hls.isSupported()) {
    // enableWorker: false because https://github.com/borisirota/webworkify-webpack/issues/45
    // and because it requires us to add 'worker-src: blob:' to our CSP
    const hls = new Hls({
      enableWorker: false,
      // The poster is the preview, so only fetch the master playlist until the first play
      autoStartLoad: false,
    });
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
    video.addEventListener(
      "play",
      () => {
        // Capping polls the player size every second, so only start it once playing
        hls.capLevelToPlayerSize = true;
        hls.startLoad();
      },
      { once: true, signal }
    );
    signal.addEventListener("abort", () => hls.destroy());
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    const source = document.createElement("source");
    source.src = hlsUrl;
    source.type = "application/x-mpegURL";
    video.append(source);
  }
}

async function renderDownloadLink(container, playback) {
  const isLatestRender = startRender(container);

  let data;
  try {
    data = await playback;
  } catch {
    return;
  }

  if (!isLatestRender() || !data.playback_id || !data.mp4_filename) {
    return;
  }

  const link = document.createElement("a");
  link.className = "download-mux-video";
  link.href = `https://stream.mux.com/${data.playback_id}/${data.mp4_filename}?download=${data.playback_id}.mp4`;
  link.textContent = i18n("discourse_video.download_video");
  container.replaceChildren(link);
}

function renderPlaceholder(container, type) {
  startRender(container);
  const placeholders = {
    pending: {
      iconHtml: "<div class='spinner'></div>",
      string: i18n("discourse_video.state.pending"),
    },
    errored: {
      iconHtml: iconHTML("triangle-exclamation"),
      string: i18n("discourse_video.state.errored"),
    },
  };
  const { iconHtml, string } = placeholders[type];
  const placeholder = document.createElement("div");
  placeholder.className = "icon-container";
  placeholder.innerHTML = `<div class="discourse-video-message"><div class="video-state-icon">${iconHtml}</div><div class="video-state"></div></div>`;
  placeholder.querySelector(".video-state").textContent = string;
  mount(container, placeholder);
}

export function renderVideos(elem, post) {
  if (!post?.discourse_video) {
    return;
  }

  const statuses = new Map(
    post.discourse_video.map((videoInfo) => videoInfo.split(":"))
  );

  // The player and the download link of a video need the same playback data
  const playbacks = new Map();
  const playbackFor = (videoId) => {
    if (!playbacks.has(videoId)) {
      playbacks.set(videoId, fetchPlayback(videoId));
    }
    return playbacks.get(videoId);
  };

  elem.querySelectorAll("div[data-video-id]").forEach((container) => {
    const { videoId } = container.dataset;
    // Embeds without a status (post not processed yet, unknown video id) are left as is
    const status = statuses.get(videoId);
    if (status === "ready") {
      renderVideo(container, playbackFor(videoId));
    } else if (status) {
      renderPlaceholder(
        container,
        status === "errored" ? "errored" : "pending"
      );
    }
  });

  elem.querySelectorAll("div[data-download-video-id]").forEach((container) => {
    const { downloadVideoId } = container.dataset;
    if (statuses.get(downloadVideoId) === "ready") {
      renderDownloadLink(container, playbackFor(downloadVideoId));
    }
  });
}
