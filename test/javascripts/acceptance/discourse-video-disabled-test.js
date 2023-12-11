import { click, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { clearToolbarCallbacks } from "discourse/components/d-editor";
import { acceptance, exists } from "discourse/tests/helpers/qunit-helpers";

acceptance("Discourse video disabled", function (needs) {
  needs.user();
  needs.settings({
    discourse_video_enabled: false,
  });
  needs.hooks.beforeEach(() => clearToolbarCallbacks());

  test("Doesn't shows upload video icon in composer", async function (assert) {
    await visit("/");
    await click("#create-topic");

    assert.ok(
      !exists(".discourse-video-upload"),
      "the upload video button is not available"
    );
  });
});
