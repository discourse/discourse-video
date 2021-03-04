DiscourseVideo::Engine.routes.draw do
  get "/:video_id" => 'display#show'
  post "/create" => 'upload#create'
  get "/playback_id/:video_id" => 'upload#fetch_playback_id'
  post "/webhook" => 'upload#webhook'
end

