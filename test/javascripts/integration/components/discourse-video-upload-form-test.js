import componentTest, {
  setupRenderingTest,
} from "discourse/tests/helpers/component-test";
import { discourseModule } from "discourse/tests/helpers/qunit-helpers";
import hbs from "htmlbars-inline-precompile";
import { getOwner } from "discourse-common/lib/get-owner";

discourseModule(
  "Discourse Video Plugin | Integration | Component | Discourse Video Upload Form",
  function (hooks) {
    setupRenderingTest(hooks);

    componentTest("Converts to minutes", {
      template: hbs`<DiscourseVideoUploadForm/>`,

      test(assert) {
        const component = this.owner.lookup(
          "component:discourse-video-upload-form"
        );
        assert.strictEqual(component.durationMinutes(60), 1);
      },
    });

    componentTest("Staff do not have a duration limit", {
      template: hbs`<DiscourseVideoUploadForm/>`,

      test(assert) {
        const component = getOwner(this).lookup(
          "component:discourse-video-upload-form"
        );

        component.setProperties({
          currentUser: { staff: true },
          videoDurationMinutes: 60,
          siteSettings: { discourse_video_max_duration_minutes: 5 },
        });

        assert.strictEqual(component.isDurationAllowed(), true);
      },
    });

    componentTest("Trust level 1 users have a duration limit", {
      template: hbs`<DiscourseVideoUploadForm/>`,

      test(assert) {
        const component = getOwner(this).lookup(
          "component:discourse-video-upload-form"
        );

        component.setProperties({
          currentUser: { staff: false, trust_level: 1 },
          videoDurationMinutes: 6,
          siteSettings: { discourse_video_max_duration_minutes: 5 },
        });

        assert.strictEqual(component.isDurationAllowed(), false);
      },
    });

    componentTest(
      "Trust level 1 users can upload if under the duration limit",
      {
        template: hbs`<DiscourseVideoUploadForm/>`,

        test(assert) {
          const component = getOwner(this).lookup(
            "component:discourse-video-upload-form"
          );

          component.setProperties({
            currentUser: { staff: false, trust_level: 1 },
            videoDurationMinutes: 4,
            siteSettings: { discourse_video_max_duration_minutes: 5 },
          });

          assert.strictEqual(component.isDurationAllowed(), true);
        },
      }
    );

    componentTest("Trust level 4 users have a duration limit", {
      template: hbs`<DiscourseVideoUploadForm/>`,

      test(assert) {
        const component = getOwner(this).lookup(
          "component:discourse-video-upload-form"
        );

        component.setProperties({
          currentUser: { staff: false, trust_level: 4 },
          videoDurationMinutes: 6,
          siteSettings: { discourse_video_max_duration_minutes_leaders: 5 },
        });

        assert.strictEqual(component.isDurationAllowed(), false);
      },
    });

    componentTest(
      "Trust level 4 users can upload if under the duration limit",
      {
        template: hbs`<DiscourseVideoUploadForm/>`,

        test(assert) {
          const component = getOwner(this).lookup(
            "component:discourse-video-upload-form"
          );

          component.setProperties({
            currentUser: { staff: false, trust_level: 4 },
            videoDurationMinutes: 4,
            siteSettings: { discourse_video_max_duration_minutes_leaders: 5 },
          });

          assert.strictEqual(component.isDurationAllowed(), true);
          assert.strictEqual(component.maxVideoDurationMinutes, 5);
        },
      }
    );

    componentTest("Returns false if the duration could not be calculated", {
      template: hbs`<DiscourseVideoUploadForm/>`,

      test(assert) {
        const component = getOwner(this).lookup(
          "component:discourse-video-upload-form"
        );

        component.setProperties({
          currentUser: { staff: false, trust_level: 4 },
          videoDurationMinutes: null,
          siteSettings: { discourse_video_max_duration_minutes_leaders: 5 },
        });

        assert.strictEqual(component.isDurationAllowed(), false);
        assert.strictEqual(component.maxVideoDurationMinutes, null);
      },
    });

    componentTest(
      "Staff can still upload if the duration could not be calculated",
      {
        template: hbs`<DiscourseVideoUploadForm/>`,

        test(assert) {
          const component = getOwner(this).lookup(
            "component:discourse-video-upload-form"
          );

          component.setProperties({
            currentUser: { staff: true },
            videoDurationMinutes: null,
            siteSettings: { discourse_video_max_duration_minutes_leaders: 5 },
          });

          assert.strictEqual(component.isDurationAllowed(), true);
          assert.strictEqual(component.maxVideoDurationMinutes, null);
        },
      }
    );
  }
);
