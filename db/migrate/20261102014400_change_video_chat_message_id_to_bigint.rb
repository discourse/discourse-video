# frozen_string_literal: true

class ChangeVideoChatMessageIdToBigint < ActiveRecord::Migration[8.1]
  def up
    change_column :discourse_video_video_chat_messages, :message_id, :bigint
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
