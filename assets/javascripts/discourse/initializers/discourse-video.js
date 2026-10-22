/* global Hls */
import { ajax } from "discourse/lib/ajax";
import { iconHTML } from "discourse/lib/icon-library";
import loadScript from "discourse/lib/load-script";
import { withPluginApi } from "discourse/lib/plugin-api";
import { i18n } from "discourse-i18n";
import DiscourseVideoUploadForm from "../components/modal/discourse-video-upload-form";

const HLS_SCRIPT_URL = "/plugins/discourse-video/javascripts/hls.min.js";

function initializeDiscourseVideo(api) {
  const siteSettings = api.container.lookup("service:site-settings");
  const modal = api.container.lookup("service:modal");
  const user = api.getCurrentUser();

  function fetchPlayback(videoId) {
    return ajax(`/discourse_video/playback_id/${videoId}`);
  }

  function mount(container, element) {
    const placeholder = container.querySelector(".icon-container");
    if (placeholder) {
      placeholder.replaceWith(element);
    } else {
      container.append(element);
    }
  }

  function renderVideo(container, playback) {
    Promise.all([playback, loadScript(HLS_SCRIPT_URL)]).then(([data]) => {
      if (!data.playback_id) {
        renderPlaceholder(container, "pending");
        return;
      }

      const video = document.createElement("video");
      video.className = "mux-video";
      video.controls = true;
      // Bounding both sides keeps 1080p portrait videos from being upscaled
      video.poster = `https://image.mux.com/${data.playback_id}/thumbnail.jpg?time=1&width=1280&height=1920`;
      video.setAttribute("playsinline", "");
      mount(container, video);

      const hlsUrl = `https://stream.mux.com/${data.playback_id}.m3u8`;

      if (Hls.isSupported()) {
        // enableWorker: false because https://github.com/borisirota/webworkify-webpack/issues/45
        // and because it requires us to add 'worker-src: blob:' to our CSP
        const hls = new Hls({ enableWorker: false });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        const source = document.createElement("source");
        source.src = hlsUrl;
        source.type = "application/x-mpegURL";
        video.append(source);
      }
    });
  }

  function renderDownloadLink(container, playback) {
    playback.then((data) => {
      if (!data.mp4_filename) {
        return;
      }

      const link = document.createElement("a");
      link.className = "download-mux-video";
      link.href = `https://stream.mux.com/${data.playback_id}/${data.mp4_filename}?download=${data.playback_id}.mp4`;
      link.textContent = i18n("discourse_video.download_video");
      container.append(link);
    });
  }

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

  function renderPlaceholder(container, type) {
    const { iconHtml, string } = placeholders[type];
    const placeholder = document.createElement("div");
    placeholder.className = "icon-container";
    placeholder.innerHTML = `<div class="discourse-video-message"><div class="video-state-icon">${iconHtml}</div><div class="video-state"></div></div>`;
    placeholder.querySelector(".video-state").textContent = string;
    mount(container, placeholder);
  }

  function renderVideos(elem, post) {
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

    elem
      .querySelectorAll("div[data-download-video-id]")
      .forEach((container) => {
        const { downloadVideoId } = container.dataset;
        if (statuses.get(downloadVideoId) === "ready") {
          renderDownloadLink(container, playbackFor(downloadVideoId));
        }
      });
  }

  api.decorateCookedElement(
    (elem, helper) => {
      const post = helper?.getModel?.();
      if (!post) {
        elem.querySelectorAll("div[data-video-id]").forEach((container) => {
          container.innerHTML = `
            <p>
              <div class="onebox-placeholder-container">
                <span class="placeholder-icon video"></span>
              </div>
            </p>`;
        });
        return;
      }
      renderVideos(elem, post);
    },
    { id: "discourse-video" }
  );

  api.decorateChatMessage?.((elem) => {
    elem.querySelectorAll("div[data-video-id]").forEach((container) => {
      const { videoId } = container.dataset;
      if (videoId) {
        renderVideo(container, fetchPlayback(videoId));
      }
    });
  });

  if (user?.can_upload_video) {
    api.registerCustomPostMessageCallback(
      "discourse_video_video_changed",
      (topicController, message) => {
        let stream = topicController.get("model.postStream");
        const post = stream.findLoadedPost(message.id);

        stream.triggerChangedPost(message.id).then(() => {
          const elements = document.querySelectorAll("article[data-post-id]");
          elements.forEach(function (elem) {
            if (elem.getAttribute("data-post-id") === message.id.toString()) {
              renderVideos(elem, post);
            }
          });
        });
      }
    );

    api.addComposerUploadHandler(
      siteSettings.discourse_video_file_extensions.split("|"),
      ([file]) => {
        modal.show(DiscourseVideoUploadForm, { model: { file } });
      }
    );

    api.onToolbarCreate((toolbar) => {
      toolbar.addButton({
        id: "discourse-video-upload",
        group: "insertions",
        icon: "video",
        title: "discourse_video.upload_toolbar_title",
        perform: () => modal.show(DiscourseVideoUploadForm),
      });
    });

    api.registerChatComposerButton?.({
      id: "discourse-video-upload",
      icon: "video",
      label: "discourse_video.upload_toolbar_title",
      position: "dropdown",
      action() {
        modal.show(DiscourseVideoUploadForm, {
          model: {
            afterUploadComplete: (videoTag) =>
              this.addText(this.getSelected(), videoTag),
          },
        });
      },
    });
  }
}

export default {
  name: "discourse-video",

  initialize(container) {
    const siteSettings = container.lookup("service:site-settings");

    if (siteSettings.discourse_video_enabled) {
      withPluginApi(initializeDiscourseVideo);
    }
  },
};
