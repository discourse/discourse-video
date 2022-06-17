import {
  acceptance,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { clearToolbarCallbacks } from "discourse/components/d-editor";

acceptance(
  "Discourse video upload button visibility in composer",
  function (needs) {
    needs.user();
    needs.settings({
      discourse_video_enabled: true,
      discourse_video_file_extensions: "mp4|mov|wmv|avi|mkv|mpg|mpeg|ogg",
      discourse_video_min_trust_level: 1,
    });
    needs.hooks.beforeEach(() => clearToolbarCallbacks());

    test("it shows upload button when can_upload_video is true", async (assert) => {
      updateCurrentUser({ can_upload_video: true });

      await visit("/");
      await click("#create-topic");

      assert.ok(
        exists(".discourse-video-upload"),
        "the upload video button is available"
      );
    });

    test("it does not show upload button when can_upload_video is false", async (assert) => {
      updateCurrentUser({ can_upload_video: false });

      await visit("/");
      await click("#create-topic");

      assert.ok(
        !exists(".discourse-video-upload"),
        "the upload video button is not available"
      );
    });
  }
);
