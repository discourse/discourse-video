# frozen_string_literal: true

module DiscourseVideo
  class DisplayController < ::ApplicationController
    requires_plugin DiscourseVideo::PLUGIN_NAME

    def get_playback_id
      video = DiscourseVideo::Video.find_by(video_id: params.require(:video_id))
      render json: video&.slice(:playback_id, :mp4_filename, :state)
    end
  end
end
