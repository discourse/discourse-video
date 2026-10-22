# frozen_string_literal: true

class AddIndexesToDiscourseVideoLookups < ActiveRecord::Migration[8.0]
  disable_ddl_transaction!

  def up
    remove_index :discourse_video_video_posts, :post_id, algorithm: :concurrently, if_exists: true
    add_index :discourse_video_video_posts, :post_id, algorithm: :concurrently

    remove_index :discourse_video_video_chat_messages,
                 :message_id,
                 algorithm: :concurrently,
                 if_exists: true
    add_index :discourse_video_video_chat_messages, :message_id, algorithm: :concurrently
  end

  def down
    remove_index :discourse_video_video_posts, :post_id, algorithm: :concurrently, if_exists: true
    remove_index :discourse_video_video_chat_messages,
                 :message_id,
                 algorithm: :concurrently,
                 if_exists: true
  end
end
