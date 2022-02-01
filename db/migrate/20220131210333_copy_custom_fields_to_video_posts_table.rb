# frozen_string_literal: true

class CopyCustomFieldsToVideoPostsTable < ActiveRecord::Migration[6.1]
  def up
    PostCustomField.where(name: 'discourse_video').find_each do |pcf|
      DiscourseVideo::VideoPost.create(post_id: pcf.post_id, video_info: pcf.value)
    end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
