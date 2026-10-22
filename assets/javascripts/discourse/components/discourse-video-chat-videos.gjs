import Component from "@glimmer/component";
import { action } from "@ember/object";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import didUpdate from "@ember/render-modifiers/modifiers/did-update";
import { renderChatVideos, stopRenders } from "../lib/render-videos";

/**
 * Renders the videos of a chat message, and renders them again whenever the
 * message's version changes. Chat bumps it when the server refreshes the
 * message, without decorating the message again.
 */
export default class DiscourseVideoChatVideos extends Component {
  willDestroy() {
    super.willDestroy(...arguments);
    stopRenders(this.args.data.element);
  }

  @action
  renderVideos() {
    renderChatVideos(this.args.data.element);
  }

  <template>
    <span
      hidden
      {{didInsert this.renderVideos}}
      {{didUpdate this.renderVideos @data.message.version}}
    ></span>
  </template>
}
