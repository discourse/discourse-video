import { click, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { clearToolbarCallbacks } from "discourse/components/d-editor";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";

acceptance("Discourse video disabled", function (needs) {
  needs.user();
  needs.settings({
    discourse_video_enabled: false,
  });
  needs.hooks.beforeEach(() => clearToolbarCallbacks());

  test("doesn't shows upload video icon in composer", async function (assert) {
    await visit("/");
    await click("#create-topic");

    assert
      .dom(".discourse-video-upload")
      .doesNotExist("the upload video button is not available");
  });
});
