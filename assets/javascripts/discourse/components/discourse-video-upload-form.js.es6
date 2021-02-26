import { default as computed } from "ember-addons/ember-computed-decorators";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";

const Upchunk = window.Upchunk;

export default Ember.Component.extend({
  file: null,

  @computed("file")
  fileName(file) {
    return file.name;
  },

  @computed("file")
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
        //this.setupEvaporate(videoInfo);
      })
      .catch(reason => {
        console.error("Could not create video.", reason);
        this.setProgress("error");
        popupAjaxError(reason);
      });
  },

  @computed("file", "videoName")
  uploadDisabled(file, videoName) {
    return !(file && videoName);
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
