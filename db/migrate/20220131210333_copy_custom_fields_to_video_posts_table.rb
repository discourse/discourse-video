# frozen_string_literal: true

class CopyCustomFieldsToVideoPostsTable < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL
      INSERT INTO discourse_video_video_posts (post_id, video_info, created_at, updated_at)
      SELECT pcf.post_id, pcf.value, pcf.created_at, pcf.updated_at
      FROM post_custom_fields pcf
      WHERE pcf.name = 'discourse_video'
      ON CONFLICT DO NOTHING
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
