import { test } from "qunit";
import { click, visit } from "@ember/test-helpers";
import { acceptance, exists } from "discourse/tests/helpers/qunit-helpers";
import { clearToolbarCallbacks } from "discourse/components/d-editor";

acceptance("Discourse video enabled", function (needs) {
  needs.user({ can_upload_video: true });
  needs.settings({
    discourse_video_enabled: true,
    discourse_video_file_extensions: "mp4|mov|wmv|avi|mkv|mpg|mpeg|ogg",
    discourse_video_min_trust_level: 1,
  });
  needs.hooks.beforeEach(() => clearToolbarCallbacks());

  test("Shows upload video button in composer", async function (assert) {
    await visit("/");
    await click("#create-topic");

    assert.ok(
      exists(".discourse-video-upload"),
      "the upload video button is available"
    );
  });
});
