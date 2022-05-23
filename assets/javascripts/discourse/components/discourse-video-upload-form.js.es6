import discourseComputed from "discourse-common/utils/decorators";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import I18n from "I18n";

const UPCHUNK = window.UpChunk;

export default Ember.Component.extend({
  file: null,
  afterUploadComplete: null,

  willDestroyElement() {
    this._super(...arguments);

    this.set("file", null);
  },

  @discourseComputed("file")
  fileName(file) {
    return file.name;
  },

  @discourseComputed("file")
  fileSize(file) {
    return this.humanFilesize(file.size);
  },

  humanFilesize(size) {
    let i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (
      (size / Math.pow(1024, i)).toFixed(2) * 1 +
      " " +
      ["B", "kB", "MB", "GB", "TB"][i]
    );
  },

  setProgress(key, args) {
    this.set(
      "uploadProgress",
      I18n.t(`discourse_video.upload_progress.${key}`, args)
    );
  },

  createVideoObject() {
    this.set("uploading", true);
    this.setProgress("preparing");
    ajax("/discourse_video/create", {
      type: "POST",
      data: { name: this.get("videoName"), filename: this.get("fileName") },
    })
      .then((videoInfo) => {
        this.setupUpChunk(videoInfo);
      })
      .catch((reason) => {
        /* eslint-disable no-console */
        console.error("Could not create video.", reason);
        /* eslint-enable no-console */
        this.setProgress("error");
        popupAjaxError(reason);
      });
  },

  setupUpChunk(videoInfo) {
    this.setProgress("starting");
    this.set("videoInfo", videoInfo);

    const upload = UPCHUNK.createUpload({
      endpoint: videoInfo["api_request_url"],
      file: this.get("file"),
      chunkSize: 5120, // Uploads the file in ~5mb chunks
    });

    // subscribe to events
    upload.on("error", (err) => {
      /* eslint-disable no-console */
      console.error("💥 🙀", err.detail);
      /* eslint-enable no-console */
    });

    upload.on("progress", (progress) => {
      /* eslint-disable no-console */
      console.log(`So far we've uploaded ${progress.detail}% of this file.`);
      /* eslint-enable no-console */
      this.setProgress("uploading", {
        progress: progress.detail.toFixed(1),
      });
    });

    upload.on("success", () => {
      /* eslint-disable no-console */
      console.log("Wrap it up, we're done here. 👋");
      /* eslint-enable no-console */
      this.uploadComplete();
    });
  },

  uploadComplete() {
    const videoInfo = this.get("videoInfo");
    this.setProgress("complete", { info: `[video=${videoInfo["video_id"]}]` });
    let videoTag = `[video=${videoInfo["video_id"]}]`;
    if (this.siteSettings.discourse_video_enable_mp4_download === true) {
      videoTag += ` [download-video=${videoInfo["video_id"]}]`;
    }

    if (this.afterUploadComplete) {
      this.afterUploadComplete(videoTag);
    } else {
      this.appEvents.trigger("composer:insert-text", videoTag);
    }
    this.sendAction("closeModal");
  },

  @discourseComputed("file")
  uploadDisabled(file) {
    return !file;
  },

  videoExtensionsToArray() {
    return this.siteSettings.discourse_video_file_extensions
      .toLowerCase()
      .replace(/[\s\.]+/g, "")
      .split("|")
      .filter((ext) => ext.indexOf("*") === -1);
  },

  isAuthorizedVideo(fileName) {
    return new RegExp(
      "\\.(" + this.videoExtensionsToArray().join("|") + ")$",
      "i"
    ).test(fileName);
  },

  actions: {
    fileChanged(event) {
      /* eslint-disable no-console */
      console.log("File Changed", event.target.files[0]);
      /* eslint-enable no-console */
      const file = event.target.files[0];
      this.set("file", file);
    },

    upload() {
      if (this.isAuthorizedVideo(this.file.name) && this.file.size > 0) {
        this.createVideoObject();
      } else {
        bootbox.alert(
          I18n.t("discourse_video.post.errors.upload_not_authorized", {
            authorized_extensions: this.videoExtensionsToArray().join(", "),
          })
        );
      }
    },
  },
});
