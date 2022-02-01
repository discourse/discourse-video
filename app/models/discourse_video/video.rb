# frozen_string_literal: true

module DiscourseVideo
  class Video < ActiveRecord::Base
    ERRORED = "errored"
    READY = "ready"
    PENDING = "pending"
    WAITING = "waiting"

    belongs_to :user

    validates :state, inclusion: { in: %w(pending ready errored waiting),
                                   message: "%{value} is not a valid state" }

    def video_posts
      DiscourseVideo::VideoPost.where("video_info LIKE ?", "#{self.video_id}%")
    end

    def video_info
      "#{video_id}:#{state}"
    end

    def update_video_post_fields!
      video_posts.update_all(video_info: video_info)
    end

    def publish_change_to_clients!
      Post.find(video_posts.pluck(:post_id)).each do |post|
        post.publish_change_to_clients! :discourse_video_video_changed
      end
    end

  end
end
