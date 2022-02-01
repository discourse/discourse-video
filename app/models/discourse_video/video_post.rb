module DiscourseVideo
  class VideoPost < ActiveRecord::Base
    belongs_to :post
  end
end

