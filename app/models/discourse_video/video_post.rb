# frozen_string_literal: true

module DiscourseVideo
  class VideoPost < ActiveRecord::Base
    belongs_to :post
  end
end

# == Schema Information
#
# Table name: discourse_video_video_posts
#
#  id         :bigint           not null, primary key
#  post_id    :integer          not null
#  video_info :string           not null
#  created_at :datetime
#  updated_at :datetime
#
