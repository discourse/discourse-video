import { find, visit } from "@ember/test-helpers";
import { test } from "qunit";
import sinon from "sinon";
import loadScript from "discourse/lib/load-script";
import { cloneJSON } from "discourse/lib/object";
import topicFixtures from "discourse/tests/fixtures/topic";
import pretender, { response } from "discourse/tests/helpers/create-pretender";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { i18n } from "discourse-i18n";

const VIDEO_ID = "8kDeYZD5hHftgpWaTHTcjUuxt8s5qkQq";
const PLAYBACK_ID = "test-playback-id";
const HLS_SCRIPT_URL = "/plugins/discourse-video/javascripts/hls.min.js";
const PLAYBACK_PATH = "/discourse_video/playback_id/";
const PLAYBACK_URL = `${PLAYBACK_PATH}${VIDEO_ID}`;
const MANIFEST_URL = `https://stream.mux.com/${PLAYBACK_ID}.m3u8`;
const POSTER_URL = `https://image.mux.com/${PLAYBACK_ID}/thumbnail.jpg?time=1&width=1280&height=1920`;
const TOPIC_URL = "/t/internationalization-localization/280";
const PLACEHOLDER = `<div class="icon-container"></div>`;

function videoContainer(videoId, content = "") {
  return `<div class="discourse-video-container" data-video-id="${videoId}">${content}</div>`;
}

function downloadContainer(videoId) {
  return `<div class="discourse-download-video-container" data-download-video-id="${videoId}"></div>`;
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

function requestedUrls(prefix) {
  return pretender.handledRequests
    .map((request) => request.url)
    .filter((url) => url.startsWith(prefix));
}

async function stubHlsSupport({ hlsJs }) {
  await loadScript(HLS_SCRIPT_URL);
  sinon.stub(window.Hls, "isSupported").returns(hlsJs);
  sinon
    .stub(HTMLMediaElement.prototype, "canPlayType")
    .callThrough()
    .withArgs("application/vnd.apple.mpegurl")
    .returns("maybe");
}

acceptance("Discourse video | Rendering videos in posts", function (needs) {
  needs.settings({ discourse_video_enabled: true });

  needs.pretender((server, helper) => {
    server.get(MANIFEST_URL, () => helper.response(404, {}));
  });
  needs.hooks.beforeEach(() => stubPlayback());

  test("renders a ready video with hls.js even when native HLS is available", async function (assert) {
    await stubHlsSupport({ hlsJs: true });
    const attachMedia = sinon.spy(window.Hls.prototype, "attachMedia");
    stubPost(
      `${videoContainer(VIDEO_ID, PLACEHOLDER)}${downloadContainer(VIDEO_ID)}`,
      [`${VIDEO_ID}:ready`]
    );

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
    assert.true(
      attachMedia.calledOnceWithExactly(find("#post_1 video.mux-video")),
      "attaches hls.js to the video"
    );
    assert.strictEqual(
      requestedUrls(MANIFEST_URL).length,
      1,
      "loads the stream through hls.js"
    );
    assert
      .dom("#post_1 video.mux-video source")
      .doesNotExist("does not use native HLS playback");
    assert
      .dom("#post_1 a.download-mux-video")
      .doesNotExist("has no download link without an MP4 rendition");
  });

  test("falls back to native HLS playback when hls.js is not supported", async function (assert) {
    await stubHlsSupport({ hlsJs: false });
    stubPost(videoContainer(VIDEO_ID), [`${VIDEO_ID}:ready`]);

    await visit(TOPIC_URL);

    assert
      .dom("#post_1 video.mux-video source")
      .hasAttribute("src", MANIFEST_URL, "uses the Mux HLS stream")
      .hasAttribute(
        "type",
        "application/x-mpegURL",
        "declares the HLS content type"
      );
    assert.strictEqual(
      requestedUrls(MANIFEST_URL).length,
      0,
      "does not load the stream through hls.js"
    );
  });

  test("renders each video in a post with its own status", async function (assert) {
    const embed = (videoId) => `#post_1 [data-video-id="${videoId}"]`;
    pretender.get("/discourse_video/playback_id/:id", ({ params }) =>
      response(
        params.id === "readyWithoutPlayback"
          ? { playback_id: null, mp4_filename: null }
          : { playback_id: PLAYBACK_ID, mp4_filename: "high.mp4" }
      )
    );
    stubPost(
      [
        videoContainer("erroredVideo", PLACEHOLDER),
        videoContainer("readyVideo"),
        videoContainer("readyWithoutPlayback"),
        videoContainer("waitingVideo"),
        videoContainer("pendingVideo"),
        videoContainer("unknownVideo"),
        downloadContainer("pendingVideo"),
      ].join(""),
      [
        "erroredVideo:errored",
        "readyVideo:ready",
        "readyWithoutPlayback:ready",
        "waitingVideo:waiting",
        "pendingVideo:pending",
      ]
    );

    await visit(TOPIC_URL);

    assert
      .dom(`${embed("erroredVideo")} .icon-container`)
      .exists({ count: 1 }, "replaces the existing placeholder");
    assert
      .dom(
        `${embed("erroredVideo")} .video-state-icon .d-icon-triangle-exclamation`
      )
      .exists("shows the error icon");
    assert
      .dom(`${embed("erroredVideo")} .video-state`)
      .hasText(
        i18n("discourse_video.state.errored"),
        "shows the errored state"
      );
    assert
      .dom(`${embed("readyVideo")} video.mux-video`)
      .exists("renders the ready video");
    assert
      .dom(`${embed("readyWithoutPlayback")} video`)
      .doesNotExist("does not render a ready video without a playback id");
    for (const videoId of [
      "readyWithoutPlayback",
      "waitingVideo",
      "pendingVideo",
    ]) {
      assert
        .dom(`${embed(videoId)} .video-state-icon .spinner`)
        .exists(`shows a spinner for ${videoId}`);
      assert
        .dom(`${embed(videoId)} .video-state`)
        .hasText(
          i18n("discourse_video.state.pending"),
          `shows the pending state for ${videoId}`
        );
    }
    assert
      .dom(embed("unknownVideo"))
      .exists("keeps the embed of a video without a status");
    assert
      .dom(`${embed("unknownVideo")} *`)
      .doesNotExist("leaves a video without a status untouched");
    assert
      .dom("#post_1 a.download-mux-video")
      .doesNotExist("has no download link for a video that is not ready");
    assert.deepEqual(
      requestedUrls(PLAYBACK_PATH),
      [
        "/discourse_video/playback_id/readyVideo",
        "/discourse_video/playback_id/readyWithoutPlayback",
      ],
      "only fetches the playback data of the ready videos"
    );
  });

  test("renders one player per embed and one download link for a video embedded twice", async function (assert) {
    stubPlayback({ mp4_filename: "high.mp4" });
    stubPost(
      `${videoContainer(VIDEO_ID)}${videoContainer(VIDEO_ID)}${downloadContainer(VIDEO_ID)}`,
      [`${VIDEO_ID}:ready`, `${VIDEO_ID}:ready`]
    );

    await visit(TOPIC_URL);

    for (const position of [1, 2]) {
      assert
        .dom(
          `#post_1 .discourse-video-container:nth-child(${position}) video.mux-video`
        )
        .exists({ count: 1 }, `renders one player in embed ${position}`);
    }
    assert
      .dom("#post_1 .discourse-download-video-container a.download-mux-video")
      .exists({ count: 1 }, "renders one download link")
      .hasAttribute(
        "href",
        `https://stream.mux.com/${PLAYBACK_ID}/high.mp4?download=${PLAYBACK_ID}.mp4`,
        "links to the MP4 download"
      )
      .hasText(
        i18n("discourse_video.download_video"),
        "labels the download link"
      );
    assert.deepEqual(
      requestedUrls(PLAYBACK_PATH),
      [PLAYBACK_URL],
      "fetches the playback data once"
    );
  });
});
