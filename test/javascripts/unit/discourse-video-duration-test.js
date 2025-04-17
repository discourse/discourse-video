import { setupTest } from "ember-qunit";
import { module, test } from "qunit";
import DiscourseVideoUploadForm from "discourse/plugins/discourse-video/discourse/components/modal/discourse-video-upload-form";

module("Unit | Component | discourse-video-upload-form", function (hooks) {
  setupTest(hooks);

  const isDurationAllowedFn = Object.getOwnPropertyDescriptor(
    DiscourseVideoUploadForm.prototype,
    "isDurationAllowed"
  ).get;

  function testIsDurationAllowed(assert, params, expectedResult, message) {
    const context = {
      currentUser: { staff: params.isStaff || false },
      videoDurationMinutes: params.duration,
      maxVideoDurationMinutes: params.maxDuration || 5,
    };

    const result = isDurationAllowedFn.call(context);
    assert.strictEqual(result, expectedResult, message);
  }

  test("isDurationAllowed returns false when duration exceeds limits", function (assert) {
    testIsDurationAllowed(
      assert,
      { duration: 10, maxDuration: 5 },
      false,
      "Duration exceeding limits is not allowed"
    );
  });

  test("isDurationAllowed returns true when duration does not exceed limits", function (assert) {
    testIsDurationAllowed(
      assert,
      { duration: 2, maxDuration: 5 },
      true,
      "Duration not exceeding limits is allowed"
    );
  });

  test("isDurationAllowed returns true for staff users regardless of duration", function (assert) {
    testIsDurationAllowed(
      assert,
      { isStaff: true, duration: 10, maxDuration: 5 },
      true,
      "Staff users are allowed regardless of duration"
    );
  });
});
