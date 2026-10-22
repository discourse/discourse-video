import { getOwner } from "@ember/owner";
import { click, fillIn, settled, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { acceptance, createFile } from "discourse/tests/helpers/qunit-helpers";

const VIDEO_ID = "8kDeYZD5hHftgpWaTHTcjUuxt8s5qkQq";

async function openComposer() {
  await visit("/");
  await click("#create-topic");
}

acceptance("Discourse video | Composer", function (needs) {
  needs.user({ can_upload_video: true });
  needs.settings({
    discourse_video_enabled: true,
    allow_uncategorized_topics: true,
    authorized_extensions: "mp4",
  });

  test("opens the upload modal from the toolbar", async function (assert) {
    await openComposer();
    await click(".discourse-video-upload");

    assert
      .dom(".discourse-video-upload-modal label.btn")
      .exists("shows the upload button");
  });

  test("opens the upload modal with a video added to the composer", async function (assert) {
    await openComposer();
    const appEvents = getOwner(this).lookup("service:app-events");
    const uploadsAborted = new Promise((resolve) =>
      appEvents.on("composer:uploads-aborted", resolve)
    );

    appEvents.trigger("composer:add-files", [
      createFile("clip.mp4", "video/mp4"),
    ]);
    await uploadsAborted;
    await settled();

    assert
      .dom(".discourse-video-upload-modal")
      .includesText("clip.mp4", "hands the video over to the upload modal");
  });

  test("shows a placeholder for videos in the preview", async function (assert) {
    await openComposer();
    await fillIn(".d-editor-input", `[video=${VIDEO_ID}]`);

    assert
      .dom(
        `.d-editor-preview .discourse-video-container[data-video-id="${VIDEO_ID}"] .onebox-placeholder-container .placeholder-icon.video`
      )
      .exists("renders the video placeholder");
  });
});

acceptance("Discourse video | Composer | Plugin disabled", function (needs) {
  needs.user({ can_upload_video: true });
  needs.settings({ discourse_video_enabled: false });

  test("does not show the upload button", async function (assert) {
    await openComposer();

    assert
      .dom(".discourse-video-upload")
      .doesNotExist("hides the upload button");
  });
});

acceptance(
  "Discourse video | Composer | User cannot upload videos",
  function (needs) {
    needs.user({ can_upload_video: false });
    needs.settings({ discourse_video_enabled: true });

    test("does not show the upload button", async function (assert) {
      await openComposer();

      assert
        .dom(".discourse-video-upload")
        .doesNotExist("hides the upload button");
    });
  }
);
