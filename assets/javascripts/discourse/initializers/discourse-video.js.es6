import { withPluginApi } from "discourse/lib/plugin-api";

function initializeDiscourseVideo(api) {
  console.log("discourse-video");
  const siteSettings = api.container.lookup("site-settings:main");

  function renderVideo($container, video_id) {
    $container.removeAttr("data-video-id");
    video_id = "M1RrzylHD7FDbL2mVC00jMd8URq028eJxt"
    const $videoElem = $("<iframe/>").attr({
      src: `${Discourse.BaseUri}/discourse_video/${video_id}`,
      class: "discourse_video"
    });
    $container.html($videoElem);
  }

  api.decorateCooked(($elem, helper) => {
    console.log("cooked");
    if (helper) {
      const post = helper.getModel();
      renderVideo($elem, post);
    } else {
      console.log('else');
      //$("div[data-video-id]", $elem).html(
      //  `<div class='icon-container'>${renderIcon("string", "film")}</div>`
      //);
    }
  });
}

export default {
  name: "discourse-video",

  initialize(container) {
    console.log("init");
    const siteSettings = container.lookup("site-settings:main");
    console.log(siteSettings);

    if (siteSettings.discourse_video_enabled) {
      withPluginApi("0.8.31", initializeDiscourseVideo);
    }
  }
};
