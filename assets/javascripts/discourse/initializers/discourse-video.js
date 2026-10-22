import { withPluginApi } from "discourse/lib/plugin-api";
import DiscourseVideoChatVideos from "../components/discourse-video-chat-videos";
import DiscourseVideoUploadForm from "../components/modal/discourse-video-upload-form";
import { renderPostVideos, stopRenders } from "../lib/render-videos";

function initializeDiscourseVideo(api) {
  const siteSettings = api.container.lookup("service:site-settings");
  const modal = api.container.lookup("service:modal");
  const user = api.getCurrentUser();

  api.decorateCookedElement(
    (elem, helper) => {
      const post = helper?.getModel?.();
      if (!post) {
        elem.querySelectorAll("div[data-video-id]").forEach((container) => {
          container.innerHTML = `<div class="onebox-placeholder-container"><span class="placeholder-icon video"></span></div>`;
        });
        return;
      }
      renderPostVideos(elem, post);
      return () => stopRenders(elem);
    },
    { id: "discourse-video" }
  );

  // Older cores don't pass the message, so their chat videos only update on reload
  api.decorateChatMessage?.((elem, helper, chatMessage) => {
    if (elem.querySelector("div[data-video-id], div[data-download-video-id]")) {
      helper.renderGlimmer(elem, DiscourseVideoChatVideos, {
        element: elem,
        message: chatMessage,
      });
    }
  });

  api.registerCustomPostMessageCallback(
    "discourse_video_video_changed",
    async (topicController, message) => {
      const { postStream } = topicController.model;
      const { cooked } = postStream.findLoadedPost(message.id) ?? {};

      try {
        await postStream.triggerChangedPost(message.id, message.updated_at);
      } catch {
        return;
      }

      // Core only re-decorates a refreshed post when its cooked HTML changes
      const post = postStream.findLoadedPost(message.id);
      const article = document.querySelector(
        `article[data-post-id="${message.id}"]`
      );
      if (article && post?.cooked === cooked) {
        renderPostVideos(article, post);
      }
    }
  );

  if (user?.can_upload_video) {
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
        // The user can switch to another composer before the upload completes
        const { textarea } = this.composer;
        modal.show(DiscourseVideoUploadForm, {
          model: {
            afterUploadComplete: (videoTag) => {
              textarea.addText(textarea.getSelected(), videoTag);
              textarea.focus();
            },
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
