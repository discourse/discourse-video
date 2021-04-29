module DiscourseVideo
  class DisplayController < ::ApplicationController
    skip_before_action :check_xhr
    requires_plugin DiscourseVideo

    def get_playback_id
      video_id = params.require(:video_id)
      playback_id = DiscourseVideo::Video.where(video_id: video_id).pluck(:playback_id).first

      render json: { playback_id: playback_id }
    end
  end
end
