# frozen_string_literal: true

module DiscourseVideo
  class Video < ActiveRecord::Base
    ERRORED = "errored"
    READY = "ready"
    PENDING = "pending"
    WAITING = "waiting"

    belongs_to :user

    validates :state,
              inclusion: {
                in: %w[pending ready errored waiting],
                message: "%{value} is not a valid state",
              }

    def self.embedded_video_infos(doc)
      video_ids = doc.css("div/@data-video-id").map(&:value)
      videos = where(video_id: video_ids).index_by(&:video_id)
      video_ids.filter_map { |video_id| videos[video_id]&.video_info }
    end

    def video_posts
      rows_for_video(DiscourseVideo::VideoPost)
    end

    def video_info
      "#{video_id}:#{state}"
    end

    def update_video_post_fields!
      video_posts.update_all(video_info: video_info)
    end

    def publish_change_to_clients!
      Post
        .includes(topic: :category)
        .where(id: video_posts.select(:post_id))
        .each do |post|
          post.publish_change_to_clients!(:discourse_video_video_changed, skip_topic_stats: true)
        end
    end

    def publish_embed_changes!
      publish_change_to_clients!
      publish_chat_message_change_to_clients! if SiteSetting.chat_enabled
    end

    def video_chat_messages
      rows_for_video(DiscourseVideo::VideoChatMessage)
    end

    def publish_chat_message_change_to_clients!
      Chat::Message
        .includes(:chat_channel)
        .where(id: video_chat_messages.pluck(:message_id))
        .each do |chat_message|
          next if !chat_message.chat_channel
          Chat::Publisher.publish_refresh!(chat_message.chat_channel, chat_message)
        end
    end

    private

    def rows_for_video(model)
      model.where("video_info LIKE ?", "#{self.class.sanitize_sql_like(video_id)}:%")
    end
  end
end

# == Schema Information
#
# Table name: discourse_video_videos
#
#  id                :bigint           not null, primary key
#  callback_key      :string
#  mp4_filename      :string
#  secret_access_key :string
#  state             :string           not null
#  created_at        :datetime
#  updated_at        :datetime
#  asset_id          :string
#  playback_id       :string
#  user_id           :integer
#  video_id          :string           not null
#
# Indexes
#
#  index_discourse_video_videos_on_video_id  (video_id) UNIQUE
#
