function addVideo(buffer, matches, state) {
  const video_id = matches[1];

  let token = new state.Token("div_open", "div", 1);
  token.attrs = [
    ["class", "discourse-video-container"],
    ["data-video-id", video_id]
  ];
  buffer.push(token);
  token = new state.Token("div_close", "div", -1);
  buffer.push(token);
}

export function setup(helper) {
  helper.whiteList(["div.discourse-video-container", "div[data-video-id]"]);

  helper.registerPlugin(md => {
    const rule = {
      matcher: /\[video=([a-zA-Z0-9]+)\]/,
      onMatch: addVideo
    };

    md.core.textPostProcess.ruler.push("discourse-video", rule);
  });
}
