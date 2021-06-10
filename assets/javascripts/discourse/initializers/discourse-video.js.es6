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
        videoContainer[0].appendChild(video);

        const url = `https://stream.mux.com/${data.playback_id}.m3u8`;

        // // Let native HLS support handle it if possible
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          /* eslint-disable no-undef */
        } else if (Hls.isSupported()) {
          // HLS.js-specific setup code
          let hls = new Hls();
          /* eslint-enable no-undef */
          hls.loadSource(url);
          hls.attachMedia(video);
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

  function renderPlaceholder($container, type) {
    $container.html(
      `<div class='icon-container'>
        <div class='discourse-video-message'>
          <div class='video-state-icon'>${placeholders[type].iconHtml}</div>
          <div class='video-state'>${placeholders[type].string}</div>
        </div>
      </div>`
    );
  }

  function renderVideos($elem, post) {
    $("div[data-video-id]", $elem).each((index, container) => {
      const $container = $(container);
      const video_id = $container.data("video-id").toString();
      if (!post.discourse_video_videos) {
        return;
      }

      const video_string = post.discourse_video_videos.find((v) => {
        return v.indexOf(`${video_id}:`) === 0;
      });

      if (video_string) {
        const status = video_string.replace(`${video_id}:`, "");
        if (status === "ready") {
          renderVideo($container, video_id);
        } else if (status === "errored") {
          renderPlaceholder($container, "errored");
        } else if (status === "waiting") {
          renderPlaceholder($container, "waiting");
        } else {
          renderPlaceholder($container, "pending");
        }
      } else {
        renderPlaceholder($container, "waiting");
      }
    });
  }

  api.decorateCooked(($elem, helper) => {
    if (helper) {
      const post = helper.getModel();
      renderVideos($elem, post);
    } else {
      $("div[data-video-id]", $elem).html(
        `<p><div class="onebox-placeholder-container">
          <span class="placeholder-icon video"></span>
        </div></p>`
      );
    }
  });

  if (user && user.can_upload_video) {
    api.registerCustomPostMessageCallback(
      "discourse_video_video_changed",
      (topicController, message) => {
        let stream = topicController.get("model.postStream");
        const post = stream.findLoadedPost(message.id);

        stream.triggerChangedPost(message.id).then(() => {
          $(
            `article[data-post-id=${message.id}] .discourse-video-message`
          ).remove();
          const $post = $(`article[data-post-id=${message.id}]`);
          renderVideos($post, post);
        });
      }
    );

    api.addComposerUploadHandler(
      siteSettings.discourse_video_file_extensions.split("|"),
      (file) => {
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
