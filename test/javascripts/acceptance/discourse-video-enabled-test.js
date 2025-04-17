import { click, fillIn, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { clearToolbarCallbacks } from "discourse/components/d-editor";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";

acceptance("Discourse video enabled", function (needs) {
  needs.user({ can_upload_video: true });
  needs.settings({
    discourse_video_enabled: true,
    discourse_video_file_extensions: "mp4|mov|wmv|avi|mkv|mpg|mpeg|ogg",
    discourse_video_min_trust_level: 1,
    allow_uncategorized_topics: true,
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

  test("Shows video placeholder in composer", async function (assert) {
    await visit("/");
    await click("#create-topic");

    // Get the composer element and set its value directly
    // This is for just testing the placeholder so we don't need to
    // go through the whole upload flow and mocking upload requests
    // to mux.
    await fillIn(".d-editor-input", "[video=8kDeYZD5hHftgpWaTHTcjUuxt8s5qkQq]");

    // Check if the preview pane shows the video container
    assert
      .dom(".d-editor-preview .discourse-video-container")
      .exists("video container appears in preview");

    // Check if it has the correct video ID
    assert
      .dom(".d-editor-preview .discourse-video-container")
      .hasAttribute(
        "data-video-id",
        "8kDeYZD5hHftgpWaTHTcjUuxt8s5qkQq",
        "video container has the correct video ID"
      );

    // Check if the placeholder elements exist
    assert
      .dom(".d-editor-preview .onebox-placeholder-container")
      .exists("placeholder container appears in preview");

    assert
      .dom(".d-editor-preview .placeholder-icon.video")
      .exists("video placeholder icon appears in preview");
  });
});
