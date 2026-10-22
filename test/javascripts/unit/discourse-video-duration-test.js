import { module, test } from "qunit";
import DiscourseVideoUploadForm from "discourse/plugins/discourse-video/discourse/components/modal/discourse-video-upload-form";

function getter(name) {
  return Object.getOwnPropertyDescriptor(
    DiscourseVideoUploadForm.prototype,
    name
  ).get;
}

module("Unit | Component | DiscourseVideoUploadForm", function () {
  test("isDurationAllowed", function (assert) {
    const isDurationAllowed = ({ staff = false, duration, limit = 5 }) =>
      getter("isDurationAllowed").call({
        currentUser: { staff },
        videoDurationMinutes: duration,
        maxVideoDurationMinutes: limit,
      });

    assert.true(isDurationAllowed({ duration: 2 }), "allows shorter videos");
    assert.false(
      isDurationAllowed({ duration: 5 }),
      "rejects videos at the limit"
    );
    assert.false(isDurationAllowed({ duration: 10 }), "rejects longer videos");
    assert.true(
      isDurationAllowed({ staff: true, duration: 10 }),
      "lets staff exceed the limit"
    );
    assert.true(
      isDurationAllowed({ duration: null, limit: 0 }),
      "allows videos of unknown duration"
    );
  });

  test("maxVideoDurationMinutes", function (assert) {
    const maxVideoDurationMinutes = (trustLevel) =>
      getter("maxVideoDurationMinutes").call({
        currentUser: { trust_level: trustLevel },
        siteSettings: {
          discourse_video_max_duration_minutes: 10,
          discourse_video_max_duration_minutes_leaders: 60,
        },
      });

    assert.strictEqual(
      maxVideoDurationMinutes(2),
      10,
      "uses the default limit"
    );
    assert.strictEqual(
      maxVideoDurationMinutes(4),
      60,
      "uses the leaders limit for trust level 4"
    );
  });
});
