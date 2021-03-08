module DiscourseVideo
  class DisplayController < ::ApplicationController
    skip_before_action :check_xhr
    requires_plugin DiscourseVideo

    def show
      video_id = params.require(:video_id)
      @playback_id = DiscourseVideo::Video.where(video_id: video_id).pluck(:playback_id).first
      render layout: false
    end
  end
end
