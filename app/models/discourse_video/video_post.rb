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
#  video_info :string           not null
#  created_at :datetime
#  updated_at :datetime
#  post_id    :integer          not null
#
# Indexes
#
#  index_discourse_video_video_posts_on_post_id  (post_id)
#
