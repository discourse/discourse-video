import { visit } from "@ember/test-helpers";
import { test } from "qunit";
import { cloneJSON } from "discourse/lib/object";
import topicFixtures from "discourse/tests/fixtures/topic";
import pretender, { response } from "discourse/tests/helpers/create-pretender";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";

const VIDEO_ID = "8kDeYZD5hHftgpWaTHTcjUuxt8s5qkQq";
const PLAYBACK_ID = "test-playback-id";
const MANIFEST_URL = `https://stream.mux.com/${PLAYBACK_ID}.m3u8`;
const POSTER_URL = `https://image.mux.com/${PLAYBACK_ID}/thumbnail.jpg?time=1&width=1280&height=1920`;
const TOPIC_URL = "/t/internationalization-localization/280";
const PLACEHOLDER = `<div class="icon-container"></div>`;

function videoContainer(videoId, content = "") {
  return `<div class="discourse-video-container" data-video-id="${videoId}">${content}</div>`;
}

function stubPost(cooked, discourseVideo) {
  pretender.get("/t/280.json", () => {
    const json = cloneJSON(topicFixtures["/t/280/1.json"]);
    Object.assign(json.post_stream.posts[0], {
      cooked,
      discourse_video: discourseVideo,
    });
    return response(json);
  });
}

function stubPlayback(data = {}) {
  pretender.get("/discourse_video/playback_id/:id", () =>
    response({ playback_id: PLAYBACK_ID, mp4_filename: null, ...data })
  );
}

acceptance("Discourse video | Rendering videos in posts", function (needs) {
  needs.settings({ discourse_video_enabled: true });

  needs.pretender((server, helper) => {
    server.get(MANIFEST_URL, () => helper.response(404, {}));
  });
  needs.hooks.beforeEach(() => stubPlayback());

  test("renders a ready video with a poster and inline playback", async function (assert) {
    stubPost(videoContainer(VIDEO_ID, PLACEHOLDER), [`${VIDEO_ID}:ready`]);

    await visit(TOPIC_URL);

    assert
      .dom("#post_1 video.mux-video")
      .hasAttribute("controls", "", "shows the playback controls")
      .hasAttribute(
        "poster",
        POSTER_URL,
        "uses the Mux thumbnail as the poster"
      )
      .hasAttribute("playsinline", "", "plays inline on mobile");
    assert
      .dom("#post_1 .icon-container")
      .doesNotExist("replaces the existing placeholder");
  });
});
