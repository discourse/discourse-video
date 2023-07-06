# frozen_string_literal: true

module DiscourseVideo
  class DisplayController < ::ApplicationController
    requires_plugin DiscourseVideo::PLUGIN_NAME

    def get_playback_id
      video_id = params.require(:video_id)
      video_info = DiscourseVideo::Video.where(video_id: video_id).as_json(only: [:playback_id, :mp4_filename]).first

      render json: video_info
    end

  end
end
