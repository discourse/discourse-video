import discourseComputed from "discourse-common/utils/decorators";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";

const Upchunk = window.Upchunk;

export default Ember.Component.extend({
  file: null,

  @discourseComputed("file")
  fileName(file) {
    return file.name;
  },

  @discourseComputed("file")
  fileSize(file) {
    return this.humanFilesize(file.size);
  },

  humanFilesize(size) {
    var i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
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
      data: { name: this.get("videoName"), filename: this.get("fileName") }
    })
      .then(videoInfo => {
        this.setupUpChunk(videoInfo);
      })
      .catch(reason => {
        console.error("Could not create video.", reason);
        this.setProgress("error");
        popupAjaxError(reason);
      });
  },

  setupUpChunk(videoInfo) {
    this.setProgress("starting");
    this.set("videoInfo", videoInfo);

    const upload = UpChunk.createUpload({
      endpoint: videoInfo["api_request_url"],
      file: this.get("file"),
      chunkSize: 5120, // Uploads the file in ~5mb chunks
    });

    // subscribe to events
    upload.on('error', err => {
      console.error('💥 🙀', err.detail);
    });

    upload.on('progress', progress => {
      console.log(`So far we've uploaded ${progress.detail}% of this file.`);
      this.setProgress("uploading", {
        progress: progress.detail.toFixed(1)
      });

    });

    upload.on('success', () => {
      console.log("Wrap it up, we're done here. 👋");
      this.uploadComplete();
    });
  },

  uploadComplete() {
    const videoInfo = this.get("videoInfo");
    this.setProgress("complete", { info: `[video=${videoInfo["video_id"]}]` });
    this.appEvents.trigger(
      "composer:insert-text",
      `[video=${videoInfo["video_id"]}]`
    );
    this.sendAction("closeModal");
  },

  @discourseComputed("file")
  uploadDisabled(file) {
    return !(file);
  },

  actions: {
    fileChanged(event) {
      console.log("File Changed", event.target.files[0]);
      const file = event.target.files[0];
      this.set("file", file);
    },

    upload() {
      this.createVideoObject();
    }
  }

});
