# frozen_string_literal: true

Fabricator(:video, class_name: "DiscourseVideo::Video") do
  user
  video_id 1
  state "waiting"
end

Fabricator(:video_post, class_name: "DiscourseVideo::VideoPost") do
  post
  video_info { sequence(:video_info) { |i| "video#{i}:ready" } }
end
