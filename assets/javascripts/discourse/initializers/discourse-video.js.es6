import loadScript from "discourse/lib/load-script";
import { ajax } from "discourse/lib/ajax";
import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";
import { renderIcon } from "discourse-common/lib/icon-library";
import I18n from "I18n";

function initializeDiscourseVideo(api) {
  const siteSettings = api.container.lookup("site-settings:main");
  const user = api.getCurrentUser();

  function renderVideo(videoContainer, videoId) {
    loadScript("/plugins/discourse-video/javascripts/hls.min.js").then(() => {
      ajax(`/discourse_video/playback_id/${videoId}`).then((data) => {
        let video = document.createElement("video");
        video.className = "mux-video";
        video.controls = "controls";
        let placeholder = videoContainer.querySelector(".icon-container");
        if (placeholder) {
          videoContainer.replaceChild(video, placeholder);
        } else {
          videoContainer.appendChild(video);
        }

        const hlsUrl = `https://stream.mux.com/${data.playback_id}.m3u8`;

        // Let native HLS support handle it if possible
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          let hlsSource = document.createElement("source");
          hlsSource.setAttribute("src", hlsUrl);
          hlsSource.setAttribute("type", "application/x-mpegURL");
          video.appendChild(hlsSource);
          /* eslint-disable no-undef */
        } else if (Hls.isSupported()) {
          let hls = new Hls();
          /* eslint-enable no-undef */
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
        }
      });
    });
  }

  function renderVideoDownloadLink(videoContainer, videoId) {
    loadScript("/plugins/discourse-video/javascripts/hls.min.js").then(() => {
      ajax(`/discourse_video/playback_id/${videoId}`).then((data) => {
        let downloadLink = document.createElement("a");
        let text = document.createTextNode(
          I18n.t("discourse_video.download_video")
        );
        downloadLink.className = "download-mux-video";
        downloadLink.appendChild(text);
        const mp4Url = `https://stream.mux.com/${data.playback_id}/${data.mp4_filename}?download=${data.playback_id}.mp4`;
        downloadLink.href = mp4Url;
        if (data.mp4_filename) {
          videoContainer.appendChild(downloadLink);
        }
      });
    });
  }

  const placeholders = {
    pending: {
      iconHtml: "<div class='spinner'></div>",
      string: I18n.t("discourse_video.state.pending"),
    },
    waiting: {
      iconHtml: "<div class='spinner'></div>",
      string: I18n.t("discourse_video.state.pending"),
    },
    errored: {
      iconHtml: renderIcon("string", "exclamation-triangle"),
      string: I18n.t("discourse_video.state.errored"),
    },
    unknown: {
      iconHtml: renderIcon("string", "question-circle"),
      string: I18n.t("discourse_video.state.unknown"),
    },
  };

  function renderPlaceholder(container, type) {
    let iconContainerDiv = document.createElement("div");
    iconContainerDiv.className = "icon-container";

    let discourseVideoMessageDiv = document.createElement("div");
    discourseVideoMessageDiv.className = "discourse-video-message";
    iconContainerDiv.appendChild(discourseVideoMessageDiv);

    let videoStateIcon = document.createElement("div");
    videoStateIcon.className = "video-state-icon";
    videoStateIcon.innerHTML = `${placeholders[type].iconHtml}`;
    discourseVideoMessageDiv.appendChild(videoStateIcon);

    let videoState = document.createElement("div");
    videoState.className = "video-state";
    videoState.innerHTML = `${placeholders[type].string}`;
    discourseVideoMessageDiv.appendChild(videoState);

    let placeholder = document.querySelector(".icon-container");
    if (placeholder) {
      container.replaceChild(iconContainerDiv, placeholder);
    } else {
      container.appendChild(iconContainerDiv);
    }
  }

  function renderVideos(elem, post) {
    elem.querySelectorAll("div[data-video-id]").forEach(function (container) {
      const videoId = container.getAttribute("data-video-id").toString();
      if (!post.discourse_video || !videoId) {
        return;
      }

      post.discourse_video.forEach((video_string) => {
        if (video_string) {
          const status = video_string.replace(`${videoId}:`, "");
          if (status === "ready") {
            renderVideo(container, videoId);
          } else if (status === "errored") {
            renderPlaceholder(container, "errored");
          } else if (status === "waiting") {
            renderPlaceholder(container, "waiting");
          } else {
            renderPlaceholder(container, "pending");
          }
        } else {
          renderPlaceholder(container, "waiting");
        }
      });
    });

    elem
      .querySelectorAll("div[data-download-video-id]")
      .forEach(function (container) {
        const videoId = container
          .getAttribute("data-download-video-id")
          .toString();
        if (!post.discourse_video || !videoId) {
          return;
        }

        post.discourse_video.forEach((video_string) => {
          if (video_string) {
            const status = video_string.replace(`${videoId}:`, "");
            if (status === "ready") {
              renderVideoDownloadLink(container, videoId);
            }
          }
        });
      });
  }

  api.decorateCookedElement((elem, helper) => {
    if (helper) {
      const post = helper.getModel();
      renderVideos(elem, post);
    } else {
      elem.querySelectorAll("div[data-video-id]").forEach(function (container) {
        container.innerHTML = `<p><div class="onebox-placeholder-container">
            <span class="placeholder-icon video"></span>
          </div></p>`;
      });
    }
  });

  if (user && user.can_upload_video) {
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
      (files) => {
        let file;
        if (Array.isArray(files)) {
          file = files[0];
        } else {
          file = files;
        }

        Ember.run.next(() => {
          showModal("discourse-video-upload-modal").setProperties({
            file,
          });
        });
      }
    );

    api.onToolbarCreate((toolbar) => {
      toolbar.addButton({
        id: "discourse-video-upload",
        group: "insertions",
        icon: "video",
        title: "discourse_video.upload_toolbar_title",
        perform: () => {
          showModal("discourse-video-upload-modal");
        },
      });
    });

    api.registerChatComposerButton?.({
      id: "discourse-video-upload",
      icon: "video",
      label: "discourse_video.upload_toolbar_title",
      position: "dropdown",
      action() {
        showModal("discourse-video-upload-modal");
      },
    });
  }
}

export default {
  name: "discourse-video",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");

    if (siteSettings.discourse_video_enabled) {
      withPluginApi("0.8.31", initializeDiscourseVideo);
    }
  },
};
