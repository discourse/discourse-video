class AddUserToDiscourseVideoVideo < ActiveRecord::Migration[6.0]
  def change
    add_column :discourse_video_videos, :user_id, :integer
  end
end
