# frozen_string_literal: true

DiscourseVideo::Engine.routes.draw do
  post "/create" => 'upload#create'
  get "/playback_id/:video_id" => 'display#get_playback_id'
  post "/webhook" => 'upload#webhook'
end
