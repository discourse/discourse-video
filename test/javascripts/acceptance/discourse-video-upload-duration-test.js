import { test } from "qunit";
import { click, visit } from "@ember/test-helpers";
import { acceptance, exists } from "discourse/tests/helpers/qunit-helpers";
import { clearToolbarCallbacks } from "discourse/components/d-editor";

acceptance(
  "Discourse video upload button visibility in composer",
  function (needs) {
    needs.user({ can_upload_video: true });
    needs.settings({
      discourse_video_enabled: true,
      discourse_video_file_extensions: "mp4|mov|wmv|avi|mkv|mpg|mpeg|ogg",
      discourse_video_min_trust_level: 0,
      discourse_video_min_trust_level: 1,
      discourse_video_max_duration_minutes: 5,
      discourse_video_max_duration_minutes_leaders: 60,

    });
    needs.hooks.beforeEach(() => clearToolbarCallbacks());

    test.skip("it does upload when duration is too large", async function (assert) {
      await visit("/");
      await click("#create-topic");
      await click(".d-editor button.discourse-video-upload");

      //assert.ok(
      //  exists("#discourse-modal div.modal-body"),
      //  "the upload modal is available"
      //);

      //assert
      //  .dom("#discourse-modal-title")
      //  .hasText("Upload Video", "it opens the upload video modal");
      //});
    });
  });

