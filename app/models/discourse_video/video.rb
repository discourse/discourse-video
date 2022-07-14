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

    def video_chat_messages
      DiscourseVideo::VideoChatMessage.where("video_info LIKE ?", "#{self.video_id}%")
    end

    def update_video_chat_message_fields!
      video_chat_messages.update_all(video_info: video_info)
    end

    def publish_chat_message_change_to_clients!
      ChatMessage.find(video_chat_messages.pluck(:message_id)).each do |chat_message|

        # DRAFT: Video state will be appended to the video_id like
        # [video=R8MzvZIYQlKNu01S56W00eL1cFQN014Pt9k:pending]. We will strip that out
        # and update the chat_message contents so that it updates in the UI.
        # new_content = "[video=R8MzvZIYQlKNu01S56W00eL1cFQN014Pt9k]"
        # There could be multiple video tags in a chat_message so we need to be sure to
        # update each one.
        new_content = chat_message.message

        chat_message.message = new_content
        chat_message.cook
        chat_message.save!

        ChatPublisher.publish_edit!(chat_message.chat_channel, chat_message)
      end
    end
  end
end
