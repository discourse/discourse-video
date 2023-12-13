# frozen_string_literal: true

Fabricator(:video, class_name: "DiscourseVideo::Video") do
  user
  video_id 1
  state "waiting"
end
