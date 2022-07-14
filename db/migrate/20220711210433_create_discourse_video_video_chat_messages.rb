# frozen_string_literal: true

class CreateDiscourseVideoVideoChatMessages < ActiveRecord::Migration[7.0]
  def change
    create_table :discourse_video_video_chat_messages do |t|
      t.integer :message_id, null: false
      t.string :video_info, null: false

      t.datetime :created_at
      t.datetime :updated_at
    end
  end
end
