import { click, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { clearToolbarCallbacks } from "discourse/components/d-editor";
import { acceptance, exists } from "discourse/tests/helpers/qunit-helpers";

acceptance(
  "Discourse video upload button visibility in composer",
  function (needs) {
    needs.user({ can_upload_video: false });
    needs.settings({
      discourse_video_enabled: true,
      discourse_video_file_extensions: "mp4|mov|wmv|avi|mkv|mpg|mpeg|ogg",
      discourse_video_min_trust_level: 1,
    });
    needs.hooks.beforeEach(() => clearToolbarCallbacks());

    test("it does not show upload button when can_upload_video is false", async function (assert) {
      await visit("/");
      await click("#create-topic");

      assert.ok(
        !exists(".discourse-video-upload"),
        "the upload video button is not available"
      );
    });
  }
);
