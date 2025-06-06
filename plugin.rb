# frozen_string_literal: true

# name: discourse-video
# about: Improved video upload and playback experience.
# version: 0.1
# authors: Blake Erickson
# url: https://github.com/discourse/discourse-video

enabled_site_setting :discourse_video_enabled

register_asset "vendor/upchunk.js"
register_asset "stylesheets/common/discourse-video.scss"
register_svg_icon "video"

require_relative "lib/discourse_video/engine"
require_relative "lib/discourse_video/mux_api"

after_initialize do
  require_relative "app/controllers/discourse_video/display_controller.rb"
  require_relative "lib/discourse_video/post_extension"

  reloadable_patch { |plugin| Post.prepend(DiscourseVideo::PostExtension) }

  TopicView.on_preload do |topic_view|
    topic_view.instance_variable_set(:@posts, topic_view.posts.includes(:discourse_video))
  end

  add_to_class(:guardian, :can_upload_video?) do
    return true if @user.admin || @user.moderator

    @user.trust_level >= SiteSetting.discourse_video_min_trust_level
  end

  add_to_serializer(:post, :discourse_video, respect_plugin_enabled: false) do
    Array(DiscourseVideo::VideoPost.where(post_id: object.id).pluck(:video_info))
  end

  add_to_serializer(:current_user, :can_upload_video) { Guardian.new(scope.user).can_upload_video? }

  on(:post_process_cooked) do |doc, post|
    video_ids = []

    doc
      .css("div/@data-video-id")
      .each do |media|
        if video = DiscourseVideo::Video.find_by_video_id(media.value)
          video_ids << video.video_info
        end
      end

    DiscourseVideo::VideoPost.where(post_id: post.id).delete_all
    if video_ids.size > 0
      params = video_ids.map { |val| { post_id: post.id, video_info: val } }
      DiscourseVideo::VideoPost.create!(params)
    end

    post.publish_change_to_clients! :discourse_video_video_changed
  end

  on(:chat_message_processed) do |doc, message|
    video_ids = []

    doc
      .css("div/@data-video-id")
      .each do |media|
        if video = DiscourseVideo::Video.find_by_video_id(media.value)
          video_ids << video.video_info
        end
      end

    DiscourseVideo::VideoChatMessage.where(message_id: message.id).delete_all
    if video_ids.size > 0
      params = video_ids.map { |val| { message_id: message.id, video_info: val } }
      DiscourseVideo::VideoChatMessage.create!(params)
    end
  end

  discourse_chat&.enable_markdown_feature("discourse-video") if respond_to?(:discourse_chat)
end
