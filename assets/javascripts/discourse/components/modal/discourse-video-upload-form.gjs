import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { Promise } from "rsvp";
import DButton from "discourse/components/d-button";
import DModal from "discourse/components/d-modal";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import dIcon from "discourse-common/helpers/d-icon";
import i18n from "discourse-common/helpers/i18n";
import I18n from "discourse-i18n";

const UPCHUNK = window.UpChunk;

export default class DiscourseVideoUploadForm extends Component {
  @service dialog;
  @service appEvents;
  @service siteSettings;
  @service currentUser;

  @tracked file = this.args.model?.file || null;
  @tracked videoDurationMinutes = null;
  @tracked maxVideoDurationMinutes = null;
  @tracked uploadProgress;
  @tracked videoInfo;
  @tracked uploading = false;

  afterUploadComplete = this.args.model?.afterUploadComplete || null;

  get fileSize() {
    return this.humanFilesize(this.file.size);
  }

  @action
  async fileChanged(event) {
    const file = event.target.files[0];
    this.file = file;
    const duration = await this.getVideoDuration(file);
    this.videoDurationMinutes = this.durationMinutes(duration);
  }

  @action
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
  }

  @action
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
  }

  @action
  async createVideoObject() {
    try {
      this.uploading = true;
      this.setProgress("preparing");
      const videoInfo = await ajax("/discourse_video/create", {
        type: "POST",
        data: { filename: this.file.name },
      });
      this.setupUpChunk(videoInfo);
    } catch (reason) {
      this.setProgress("error");
      popupAjaxError(reason);
    }
  }

  setProgress(key, args) {
    this.uploadProgress = I18n.t(
      `discourse_video.upload_progress.${key}`,
      args
    );
  }

  setupUpChunk(videoInfo) {
    this.setProgress("starting");
    this.videoInfo = videoInfo;

    const upload = UPCHUNK.createUpload({
      endpoint: videoInfo["api_request_url"],
      file: this.file,
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
  }

  uploadComplete() {
    const videoInfo = this.videoInfo;
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
  }

  get uploadDisabled() {
    return !this.file;
  }

  videoExtensionsToArray() {
    return this.siteSettings.discourse_video_file_extensions
      .toLowerCase()
      .replace(/[\s\.]+/g, "")
      .split("|")
      .filter((ext) => ext.indexOf("*") === -1);
  }

  isAuthorizedVideo(fileName) {
    return new RegExp(
      `\\.(${this.videoExtensionsToArray().join("|")})$`,
      "i"
    ).test(fileName);
  }

  isDurationAllowed() {
    if (this.currentUser.staff) {
      return true;
    }
    if (this.videoDurationMinutes === null) {
      return false;
    }
    if (this.currentUser.trust_level === 4) {
      this.maxVideoDurationMinutes =
        this.siteSettings.discourse_video_max_duration_minutes_leaders;
      if (this.videoDurationMinutes < this.maxVideoDurationMinutes) {
        return true;
      }
    }
    if (this.currentUser.trust_level < 4) {
      this.maxVideoDurationMinutes =
        this.siteSettings.discourse_video_max_duration_minutes;
      if (this.videoDurationMinutes < this.maxVideoDurationMinutes) {
        return true;
      }
    }
    return false;
  }

  durationMinutes(duration) {
    return parseInt(duration / 60, 10);
  }

  humanFilesize(size) {
    let i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (
      (size / Math.pow(1024, i)).toFixed(2) * 1 +
      " " +
      ["B", "kB", "MB", "GB", "TB"][i]
    );
  }

  <template>
    <DModal
      @title={{i18n "discourse_video.modal_title"}}
      @subtitle={{i18n "discourse_video.modal_subtitle"}}
      class="discourse-video-upload-modal"
      @closeModal={{@closeModal}}
    >
      <:body>
        <h3>{{i18n "discourse_video.file"}}</h3>
        <p>
          {{~#if this.file}}
            {{this.file.name}}
            ({{this.fileSize}})
          {{~/if}}
          <label
            class="btn"
            disabled={{this.uploading}}
            title={{i18n "discourse_video.select_file"}}
          >
            {{dIcon "video"}}&nbsp;{{i18n "discourse_video.select_file"}}
            <input
              disabled={{this.uploading}}
              type="file"
              id="video-upload-input"
              onchange={{this.fileChanged}}
            />
          </label>
        </p>
      </:body>
      <:footer>
        {{#if this.uploading}}
          {{this.uploadProgress}}
        {{else}}
          <DButton
            @action={{this.upload}}
            @icon="upload"
            @label="upload"
            @disabled={{this.uploadDisabled}}
          />
        {{/if}}
      </:footer>
    </DModal>
  </template>
}
