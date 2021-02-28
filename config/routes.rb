DiscourseVideo::Engine.routes.draw do
  get "/:video_id" => 'display#show'
  post "/create" => 'upload#create'
end

