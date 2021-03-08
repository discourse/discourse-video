# name: discourse-video
# about: Improved video upload and playback experience.
# version: 0.1
# authors: Blake Erickson
# url: https://github.com/oblakeerickson/discourse-video

gem 'ethon', '0.9.0' # required by typhoeus
gem 'typhoeus', '1.0.2' # required by mux_ruby
gem 'mux_ruby', '1.8.1'

enabled_site_setting :discourse_video_enabled

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

#  require_relative 'app/jobs/regular/upload_video_to_provider'
#
#  on(:post_process_cooked) do |doc, post|
#    puts "!!!!!!!!!!!!POST PROCESS !!!!!!!!!!!!!!!!!!!!!"
#
#    ### Find video file(s)
#    post_uploads = PostUpload.where(post_id: post.id)
#    post_uploads.each do |pu|
#      # check if upload is a video
#      upload = Upload.find_by(id: pu.upload_id)
#      puts "################ #{upload.original_filename}"
#      extension = File.extname(upload.original_filename).strip.downcase[1..-1]
#      # TODO: Read these from site settings
#      if extension.match(/(mov|mp4)/)
#        puts "IS VIDEO !!!!!!!!!!!!!!"
#        `curl -X POST -i https://api.mux.com/video/v1/assets -H "Content-Type: application/json" -u "a35c6c6f-ce9c-47af-8f78-f90a266efbc4:URH8cPOEuvcxIoJ//Z7aizMDcksA25Tkz1Ev9QDOxye30Bg8Ns+0S3Vw76K9+vMJApsjkO+axJ2" --data-binary @body.json`
#        #Jobs.enqueue(1, :upload_video_to_provider, post_id: post.id, upload_id: upload.id, bypass_bump: bypass_bump)
#      end
#    end
#  end
end
