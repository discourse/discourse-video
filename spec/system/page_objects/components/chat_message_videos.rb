# frozen_string_literal: true

module PageObjects
  module Components
    class ChatMessageVideos < PageObjects::Components::Base
      SELECTOR = ".chat-message-text"

      def has_processing_video?(video)
        has_css?(
          "#{embed(video.video_id)} .video-state",
          text: I18n.t("js.discourse_video.state.pending"),
        )
      end

      def has_errored_video?(video)
        has_css?(
          "#{embed(video.video_id)} .video-state",
          text: I18n.t("js.discourse_video.state.errored"),
        )
      end

      def has_untouched_embed?(video_id)
        has_css?("#{embed(video_id)}:empty")
      end

      def has_player?(video)
        has_css?(player(video))
      end

      def tag_player(video)
        find(player(video)).execute_script("this.dataset.tagged = true")
      end

      def has_tagged_player?(video)
        has_css?("#{player(video)}[data-tagged]")
      end

      def has_download_link?(video)
        has_css?(
          "#{SELECTOR} a.download-mux-video[href^='https://stream.mux.com/#{video.playback_id}/#{video.mp4_filename}']",
          text: I18n.t("js.discourse_video.download_video"),
        )
      end

      def has_no_download_link?
        has_no_css?("#{SELECTOR} a.download-mux-video")
      end

      private

      def embed(video_id)
        "#{SELECTOR} div[data-video-id='#{video_id}']"
      end

      def player(video)
        "#{embed(video.video_id)} video.mux-video[poster^='https://image.mux.com/#{video.playback_id}/']"
      end
    end
  end
end
