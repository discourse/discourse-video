function addVideo(buffer, matches, state) {
  const video_id = matches[1];

  let token = new state.Token("div_open", "div", 1);
  token.attrs = [
    ["class", "discourse-video-container"],
    ["data-video-id", video_id],
  ];
  buffer.push(token);
  token = new state.Token("div_close", "div", -1);
  buffer.push(token);
}

function addDownloadVideo(buffer, matches, state) {
  const video_id = matches[1];

  let token = new state.Token("div_open", "div", 1);
  token.attrs = [
    ["class", "discourse-download-video-container"],
    ["data-download-video-id", video_id],
  ];
  buffer.push(token);
  token = new state.Token("div_close", "div", -1);
  buffer.push(token);
}

export function setup(helper) {
  helper.allowList(["div.discourse-video-container", "div[data-video-id]"]);

  helper.registerPlugin((md) => {
    const rule = {
      matcher: /\[video=([a-zA-Z0-9]+)\]/,
      onMatch: addVideo,
    };

    md.core.textPostProcess.ruler.push("discourse-video", rule);
  });

  helper.allowList(["div.discourse-download-video-container", "div[data-download-video-id]"]);

  helper.registerPlugin((md) => {
    const rule = {
      matcher: /\[download-video=([a-zA-Z0-9]+)\]/,
      onMatch: addDownloadVideo,
    };

    md.core.textPostProcess.ruler.push("discourse-download-video", rule);
  });
}
