import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { clearToolbarCallbacks } from "discourse/components/d-editor";

acceptance("Discourse video disabled", function (needs) {
  needs.user();
  needs.settings({
    discourse_video_enabled: false,
  });
  needs.hooks.beforeEach(() => clearToolbarCallbacks());

  test("Doesn't shows upload video icon in composer", async (assert) => {
    await visit("/");
    await click("#create-topic");

    assert.ok(
      !exists(".discourse-video-upload"),
      "the upload video button is not available"
    );
  });
});
