import { click, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { clearToolbarCallbacks } from "discourse/components/d-editor";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";

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

    assert
      .dom(".discourse-video-upload")
      .exists("the upload video button is available");
  });

  test("Displays video upload modal", async function (assert) {
    await visit("/t/internationalization-localization/280");
    await click("#post_1 .show-more-actions");
    await click("#post_1 .edit");
    await click(".discourse-video-upload");

    assert.dom(".discourse-video-upload-modal").exists();
    assert
      .dom(".discourse-video-upload-modal label.btn")
      .exists("the upload button is present");
  });
});
