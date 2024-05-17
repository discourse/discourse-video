# frozen_string_literal: true

module DiscourseVideo
  module PostExtension
    extend ActiveSupport::Concern

    prepended { has_many :discourse_video, class_name: "DiscourseVideo::VideoPost" }
  end
end
