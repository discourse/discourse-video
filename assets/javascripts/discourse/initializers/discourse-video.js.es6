import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";
import { renderIcon } from "discourse-common/lib/icon-library";

function initializeDiscourseVideo(api) {
  console.log("discourse-video");
  const siteSettings = api.container.lookup("site-settings:main");

  function renderVideo($container, videoId) {
    $container.removeAttr("data-video-id");
    const $videoElem = $("<iframe/>").attr({
      src: `${Discourse.BaseUri}/discourse_video/${videoId}`,
      class: "discourse_video"
    });
    $container.html($videoElem);
  }

  api.decorateCooked(($elem, helper) => {
    if (helper) {
      const post = helper.getModel();
      //console.log(post);
      console.log(post.cooked);
      let videoIdParts = post.cooked.split('[video=');
      if (videoIdParts.length > 1) {
        console.log(videoIdParts);
        let videoId = videoIdParts[1].split(']')[0];
        console.log(videoId);
        renderVideo($elem, videoId);
      }
    } else {
      console.log('else');
      //$("div[data-video-id]", $elem).html(
      //  `<div class='icon-container'>${renderIcon("string", "film")}</div>`
      //);
    }
  });

  api.onToolbarCreate(toolbar => {
    toolbar.addButton({
      id: "discourse-video-upload",
      group: "insertions",
      icon: "film",
      title: "discourse_video.upload_toolbar_title",
      perform: () => {
        showModal("discourse-video-upload-modal");
      }
    });
  });

}

export default {
  name: "discourse-video",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");

    if (siteSettings.discourse_video_enabled) {
      withPluginApi("0.8.31", initializeDiscourseVideo);
    }
  }
};
