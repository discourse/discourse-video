module DiscourseVideo
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
