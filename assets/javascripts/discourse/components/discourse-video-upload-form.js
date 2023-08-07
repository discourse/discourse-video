import Component from "@ember/component";
import discourseComputed from "discourse-common/utils/decorators";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import I18n from "I18n";
import { inject as service } from "@ember/service";
import { Promise } from "rsvp";

const UPCHUNK = window.UpChunk;

export default Component.extend({
  dialog: service(),
  file: null,
  afterUploadComplete: null,
  videoDurationMinutes: null,
  maxVideoDurationMinutes: null,

  willDestroyElement() {
    this._super(...arguments);

    this.set("file", null);
    this.set("videoDurationMinutes", null);
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

  async getVideoDuration(file) {
    return new Promise((resolve, reject) => {
      let video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        resolve(video.duration);
      };

      video.onerror = () => {
        reject("Error processing video file");
      };

      video.src = URL.createObjectURL(file);
    });
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

    upload.on("progress", (progress) => {
      this.setProgress("uploading", {
        progress: progress.detail.toFixed(1),
      });
    });

    upload.on("success", () => {
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

  isDurationAllowed() {
    if (this.videoDurationMinutes === null) {
      return false;
    }
    if (this.currentUser.staff) {
      return true;
    }
    if (this.currentUser.trust_level === 4) {
      this.set(
        "maxVideoDurationMinutes",
        this.siteSettings.discourse_video_max_duration_minutes_leaders
      );
      if (
        this.videoDurationMinutes <
        this.siteSettings.discourse_video_max_duration_minutes_leaders
      ) {
        return true;
      }
    }
    if (this.currentUser.trust_level < 4) {
      this.set(
        "maxVideoDurationMinutes",
        this.siteSettings.discourse_video_max_duration_minutes
      );
      if (
        this.videoDurationMinutes <
        this.siteSettings.discourse_video_max_duration_minutes
      ) {
        return true;
      }
    }
    return false;
  },

  durationMinutes(duration) {
    return parseInt(duration / 60, 10);
  },

  actions: {
    async fileChanged(event) {
      const file = event.target.files[0];
      this.set("file", file);
      const duration = await this.getVideoDuration(file);
      this.set("videoDurationMinutes", this.durationMinutes(duration));
    },

    upload() {
      if (this.isAuthorizedVideo(this.file.name) && this.file.size > 0) {
        if (this.isDurationAllowed()) {
          this.createVideoObject();
        } else {
          if (!this.maxVideoDurationMinutes) {
            this.dialog.alert(
              I18n.t("discourse_video.post.errors.duration_error")
            );
          } else {
            this.dialog.alert(
              I18n.t("discourse_video.post.errors.allowed_duration_exceeded", {
                allowed_duration: this.maxVideoDurationMinutes,
              })
            );
          }
        }
      } else {
        this.dialog.alert(
          I18n.t("discourse_video.post.errors.upload_not_authorized", {
            authorized_extensions: this.videoExtensionsToArray().join(", "),
          })
        );
      }
    },
  },
});
