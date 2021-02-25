module DiscourseVideo
  class DisplayController < ::ApplicationController
    skip_before_action :check_xhr
    requires_plugin DiscourseVideo

    def show
      @video_id = params.require(:video_id)
      render layout: false
    end
  end
end
