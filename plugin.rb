# name: discourse-video
# about: Improved video upload and playback experience.
# version: 0.1
# authors: Blake Erickson
# url: https://github.com/oblakeerickson/discourse-video

gem 'ethon', '0.9.0' # required by typhoeus
gem 'typhoeus', '1.0.2' # required by mux_ruby
gem 'mux_ruby', '1.8.1'

enabled_site_setting :discourse_video_enabled

register_svg_icon "fa-video" if respond_to?(:register_svg_icon)

extend_content_security_policy(
  script_src: ["https://cdn.jsdelivr.net", "https://stream.mux.com"]
)
register_asset "vendor/hls.min.js"
register_asset "vendor/mux-load-stream.js"
register_asset "vendor/upchunk.js"

#https://stream.mux.com/FC9pbuRQwEgiTPDmm5PoRRO5lRhVyHUE.m3u8
%w{
  ../lib/discourse_video/engine.rb
  ../lib/discourse_video/mux_api.rb
}.each do |path|
  load File.expand_path(path, __FILE__)
end

after_initialize do
  require_relative "app/controllers/discourse_video/display_controller.rb"

  register_post_custom_field_type('discourse_video', :string)

  topic_view_post_custom_fields_whitelister do |user|
    DiscourseVideo::POST_CUSTOM_FIELD_NAME
  end

  add_to_serializer(:post, :discourse_video_videos, false) do
    Array(post_custom_fields[DiscourseVideo::POST_CUSTOM_FIELD_NAME])
  end

  on(:post_process_cooked) do |doc, post|
    video_ids = []
    doc.css("div/@data-video-id").each do |media|
      if video = DiscourseVideo::Video.find_by_video_id(media.value)
        video_ids << video.post_custom_field_value
      end
    end

    PostCustomField.transaction do
      PostCustomField.where(post_id: post.id, name: DiscourseVideo::POST_CUSTOM_FIELD_NAME).delete_all
      if video_ids.size > 0
        params = video_ids.map do |val|
          {
            post_id: post.id,
            name: DiscourseVideo::POST_CUSTOM_FIELD_NAME,
            value: val
          }
        end
        PostCustomField.create!(params)
      end
    end
  end

end
