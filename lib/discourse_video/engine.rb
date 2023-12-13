# frozen_string_literal: true

module DiscourseVideo
  PLUGIN_NAME = "discourse-video"
  POST_CUSTOM_FIELD_NAME = "discourse_video"

  class Engine < ::Rails::Engine
    engine_name PLUGIN_NAME
    isolate_namespace DiscourseVideo

    config.after_initialize do
      Discourse::Application.routes.append do
        mount ::DiscourseVideo::Engine, at: "/discourse_video"
      end
    end
  end
end
