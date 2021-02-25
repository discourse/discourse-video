DiscourseVideo::Engine.routes.draw do
  get "/:video_id" => 'display#show'
end

