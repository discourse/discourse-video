# frozen_string_literal: true

module DiscourseVideo
  class VideoPost < ActiveRecord::Base
    belongs_to :post
  end
end
