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

function placeholder(type) {
  const iconHtml =
    type === "errored"
      ? iconHTML("triangle-exclamation")
      : "<div class='spinner'></div>";
  const element = document.createElement("div");
  element.className = "icon-container";
  element.innerHTML = `<div class="discourse-video-message"><div class="video-state-icon">${iconHtml}</div><div class="video-state"></div></div>`;
  element.querySelector(".video-state").textContent = i18n(
    `discourse_video.state.${type}`
  );
  return element;
}

function mountPlayer(container, playbackId) {
  const video = document.createElement("video");
  video.className = "mux-video";
  video.controls = true;
  // Bounding both sides keeps 1080p portrait videos from being upscaled
  video.poster = `https://image.mux.com/${playbackId}/thumbnail.jpg?time=1&width=1280&height=1920`;
  video.setAttribute("playsinline", "");
  const signal = mount(container, video, playbackId);

  const hlsUrl = `https://stream.mux.com/${playbackId}.m3u8`;

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

async function renderVideo(container, status, playback) {
  const isLatestRender = startRender(container);

  let state, data;
  try {
    state = await status;
    if (state === "ready") {
      [data] = await Promise.all([playback(), loadScript(HLS_SCRIPT_URL)]);
    }
  } catch {
    // A failed request leaves the embed as it is
    return;
  }

  // Embeds without a status (unprocessed post, unknown video id) are left as is
  if (!isLatestRender() || !state) {
    return;
  }

  if (state === "ready" && data?.playback_id) {
    // Keeps a playing video going when a re-render leaves it unchanged
    if (mounted.get(container)?.playbackId !== data.playback_id) {
      mountPlayer(container, data.playback_id);
    }
  } else {
    mount(container, placeholder(state === "errored" ? "errored" : "pending"));
  }
}

async function renderDownloadLink(container, status, playback) {
  const isLatestRender = startRender(container);

  let data;
  try {
    if ((await status) !== "ready") {
      return;
    }
    data = await playback();
  } catch {
    return;
  }

  if (!isLatestRender() || !data?.playback_id || !data.mp4_filename) {
    return;
  }

  const link = document.createElement("a");
  link.className = "download-mux-video";
  link.href = `https://stream.mux.com/${data.playback_id}/${data.mp4_filename}?download=${data.playback_id}.mp4`;
  link.textContent = i18n("discourse_video.download_video");
  container.replaceChildren(link);
}

// `statusOf` can derive a status from the playback data it shares with the renders
function renderVideos(elem, statusOf) {
  // The player and the download link of a video need the same playback data
  const playbacks = new Map();
  const playbackFor = (videoId) => {
    if (!playbacks.has(videoId)) {
      playbacks.set(videoId, ajax(`/discourse_video/playback_id/${videoId}`));
    }
    return playbacks.get(videoId);
  };

  elem.querySelectorAll("div[data-video-id]").forEach((container) => {
    const { videoId } = container.dataset;
    renderVideo(container, statusOf(videoId, playbackFor), () =>
      playbackFor(videoId)
    );
  });

  elem.querySelectorAll("div[data-download-video-id]").forEach((container) => {
    const { downloadVideoId } = container.dataset;
    renderDownloadLink(container, statusOf(downloadVideoId, playbackFor), () =>
      playbackFor(downloadVideoId)
    );
  });
}

export function renderPostVideos(elem, post) {
  if (!post?.discourse_video) {
    return;
  }

  const statuses = new Map(
    post.discourse_video.map((videoInfo) => videoInfo.split(":"))
  );
  renderVideos(elem, (videoId) => statuses.get(videoId));
}

// Chat messages carry no video statuses, so they come with the playback data
export function renderChatVideos(elem) {
  renderVideos(
    elem,
    async (videoId, playbackFor) => (await playbackFor(videoId))?.state
  );
}

export function stopRenders(elem) {
  elem.querySelectorAll(EMBEDS_SELECTOR).forEach((container) => {
    renders.delete(container);
    mounted.get(container)?.controller.abort();
    mounted.delete(container);
  });
}
