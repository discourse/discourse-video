import { acceptance, updateCurrentUser } from "discourse/tests/helpers/qunit-helpers";

acceptance("Discourse video upload button visibility in composer", {
  loggedIn: true,
  settings: {
    discourse_video_enabled: true,
    discourse_video_file_extensions: "mp4|mov|wmv|avi|mkv|mpg|mpeg|ogg",
    discourse_video_min_trust_level: 1
  },
});

test("it shows upload button when user has specified trust level", async (assert) => {
  updateCurrentUser({ trust_level: 1 });

  await visit("/");
  await click("#create-topic");

  assert.ok(exists(".discourse-video-upload"), "the upload video button is available");
});

test("it shows upload button when user is staff", async (assert) => {
  updateCurrentUser({ staff: true });

  await visit("/");
  await click("#create-topic");

  assert.ok(exists(".discourse-video-upload"), "the upload video button is available");
});

test("it does not show upload button when user does not have specified trust level", async (assert) => {
  updateCurrentUser({ staff: false, trust_level: 0 });

  await visit("/");
  await click("#create-topic");

  assert.ok(exists(".discourse-video-upload"), "the upload video button is available");
});
