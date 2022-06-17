# frozen_string_literal: true

# name: discourse-video
# about: Improved video upload and playback experience.
# version: 0.1
# authors: Blake Erickson
# url: https://github.com/discourse/discourse-video
# transpile_js: true

enabled_site_setting :discourse_video_enabled

register_asset "vendor/upchunk.js"
register_asset 'stylesheets/common/discourse-video.scss'
register_asset 'stylesheets/desktop/discourse-video.scss', :desktop
register_asset 'stylesheets/mobile/discourse-video.scss', :mobile
register_svg_icon "fa-video"

extend_content_security_policy(
  worker_src: ['blob:']
)

%w{
  ../lib/discourse_video/engine.rb
  ../lib/discourse_video/mux_api.rb
}.each do |path|
  load File.expand_path(path, __FILE__)
end

after_initialize do
  require_relative "app/controllers/discourse_video/display_controller.rb"

  reloadable_patch do |plugin|
    class ::Post
      has_many :discourse_video, class_name: 'DiscourseVideo::VideoPost'
    end
  end

  TopicView.on_preload do |topic_view|
    topic_view.instance_variable_set(:@posts, topic_view.posts.includes(:discourse_video))
  end

  add_to_class(:guardian, :can_upload_video?) do
    return true if @user.admin || @user.moderator

    @user.trust_level >= SiteSetting.discourse_video_min_trust_level
  end

  add_to_serializer(:post, :discourse_video, false) do
    Array(DiscourseVideo::VideoPost.where(post_id: object.id).pluck(:video_info))
  end

  add_to_serializer(:current_user, :can_upload_video) do
    Guardian.new(scope.user).can_upload_video?
  end

  on(:post_process_cooked) do |doc, post|
    video_ids = []

    doc.css("div/@data-video-id").each do |media|
      if video = DiscourseVideo::Video.find_by_video_id(media.value)
        video_ids << video.video_info
      end
    end

    DiscourseVideo::VideoPost.where(post_id: post.id).delete_all
    if video_ids.size > 0
      params = video_ids.map do |val|
        {
          post_id: post.id,
          video_info: val
        }
      end
      DiscourseVideo::VideoPost.create!(params)
    end

    post.publish_change_to_clients! :discourse_video_video_changed
  end
end
