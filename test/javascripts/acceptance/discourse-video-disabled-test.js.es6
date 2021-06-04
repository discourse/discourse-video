import { acceptance } from "discourse/tests/helpers/qunit-helpers";

acceptance("Discourse video disabled", {
  loggedIn: true,
  settings: {
    discourse_video_enabled: false
  },
});

test("Doesn't shows upload video icon in composer", async (assert) => {
  await visit("/");
  await click("#create-topic");

  assert.ok(!exists(".discourse-video-upload"), "the upload video button is not available");
});
