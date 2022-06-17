import {
  acceptance,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { clearToolbarCallbacks } from "discourse/components/d-editor";

acceptance("Discourse video enabled", function (needs) {
  needs.user();
  needs.settings({
    discourse_video_enabled: true,
    discourse_video_file_extensions: "mp4|mov|wmv|avi|mkv|mpg|mpeg|ogg",
    discourse_video_min_trust_level: 1,
  });
  needs.hooks.beforeEach(() => clearToolbarCallbacks());

  test("Shows upload video button in composer", async (assert) => {
    updateCurrentUser({ can_upload_video: true });
    await visit("/");
    await click("#create-topic");

    assert.ok(
      exists(".discourse-video-upload"),
      "the upload video button is available"
    );
  });
});
