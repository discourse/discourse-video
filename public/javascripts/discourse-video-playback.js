(function(){
    var video = document.getElementById("myVideo");
    var playbackId = video.dataset.playbackid;
    var url = "https://stream.mux.com/"+playbackId+".m3u8";

    // Let native HLS support handle it if possible
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else if (Hls.isSupported()) {
      // HLS.js-specific setup code
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    }
})();