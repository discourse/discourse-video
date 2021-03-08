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
    const config = {
      //bucket: videoInfo["bucket"],
      //aws_key: videoInfo["access_key_id"],
      //signerUrl: `/brightcove/sign/${videoInfo["video_id"]}.json`,
      //computeContentMd5: true,
      //cryptoMd5Method: function(data) {
      //  return btoa(SparkMD5.ArrayBuffer.hash(data, true));
      //},
      //cryptoHexEncodedHash256: function(data) {
      //  return sha256(data);
      //},
      //logging: false
    };

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

    //Evaporate.create(config)
    //  .then(evaporate => {
    //    this.startEvaporateUpload(evaporate);
    //  })
    //  .catch(reason => {
    //    console.error("Brightcove failed to initialize. Reason: ", reason);
    //    this.setProgress("error");
    //  });
  },

  //startEvaporateUpload(evaporate) {
  //  this.setProgress("uploading");

  //  const videoInfo = this.get("videoInfo");

  //  const headers = {
  //    "X-Amz-Security-Token": videoInfo["session_token"]
  //  };

  //  const add_config = {
  //    name: videoInfo["object_key"],
  //    file: this.get("file"),
  //    progress: progressValue => {
  //      this.setProgress("uploading", {
  //        progress: (progressValue * 100).toFixed(1)
  //      });
  //    },
  //    xAmzHeadersAtInitiate: headers,
  //    xAmzHeadersCommon: headers
  //  };

  //  evaporate
  //    .add(add_config)
  //    .then(() => {
  //      this.ingestVideo();
  //    })
  //    .catch(reason => {
  //      console.error("Brightcove upload failed. Reason: ", reason);
  //      this.setProgress("error");
  //    });
  //},

  //ingestVideo() {
  //  this.setProgress("finishing");
  //  const videoInfo = this.get("videoInfo");
  //  ajax(`/brightcove/ingest/${videoInfo["video_id"]}`, {
  //    type: "POST"
  //  })
  //    .then(() => {
  //      this.ingestComplete();
  //    })
  //    .catch(error => {
  //      console.error("Failed to ingest. Reason: ", error);
  //      this.setProgress("error");
  //    });
  //},

  //fetchPlaybackId() {
  //  const videoInfo = this.get("videoInfo");
  //  const videoId = videoInfo["video_id"]
  //  ajax(`/discourse_video/playback_id/${videoId}`, {
  //    type: "GET",
  //  })
  //    .then(playbackId => {
  //      this.uploadComplete(playbackId);
  //    })
  //    .catch(reason => {
  //      console.error("Could not get playbackId.", reason);
  //      this.setProgress("error");
  //      popupAjaxError(reason);
  //    });
  //},

  uploadComplete() {
    const videoInfo = this.get("videoInfo");
    this.setProgress("complete", { info: `[video=${videoInfo["video_id"]}]` });
    this.appEvents.trigger(
      "composer:insert-text",
      `[video=${videoInfo["video_id"]}]`
    );
    this.sendAction("closeModal");
  },

  @computed("file")
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
