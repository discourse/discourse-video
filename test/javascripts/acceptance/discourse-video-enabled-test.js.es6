import { acceptance, updateCurrentUser } from "discourse/tests/helpers/qunit-helpers";

acceptance("Discourse video enabled", {
  loggedIn: true,
  settings: {
    discourse_video_enabled: true,
    discourse_video_file_extensions: "mp4|mov|wmv|avi|mkv|mpg|mpeg|ogg",
    discourse_video_min_trust_level: 1
  },
});

test("Shows upload video button in composer", async (assert) => {
  updateCurrentUser({ trust_level: 1 });
  await visit("/");
  await click("#create-topic");

  assert.ok(exists(".discourse-video-upload"), "the upload video button is available");
});
