# frozen_string_literal: true

module DiscourseVideo
  POST_CUSTOM_FIELD_NAME = "discourse_video"

  class Engine < ::Rails::Engine
    engine_name "DiscourseVideo"
    isolate_namespace DiscourseVideo

    config.after_initialize do
      Discourse::Application.routes.append do
        mount ::DiscourseVideo::Engine, at: '/discourse_video'
      end
    end
  end
end
