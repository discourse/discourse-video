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

    def post_custom_fields
      PostCustomField.where(name: DiscourseVideo::POST_CUSTOM_FIELD_NAME).where("value LIKE ?", "#{self.video_id}%")
    end

    def post_custom_field_value
      "#{video_id}:#{state}"
    end

    def update_post_custom_fields!
      post_custom_fields.update_all(value: post_custom_field_value)
    end

    def publish_change_to_clients!
      Post.find(post_custom_fields.pluck(:post_id)).each do |post|
        post.publish_change_to_clients! :discourse_video_video_changed
      end
    end

  end
end
