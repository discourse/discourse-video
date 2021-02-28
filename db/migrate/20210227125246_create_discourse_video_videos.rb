class CreateDiscourseVideoVideos < ActiveRecord::Migration[6.0]
  def change
    create_table :discourse_video_videos do |t|
      t.string :video_id, null: false
      t.string :state, null: false
      t.string :secret_access_key
      t.string :api_request_url
      t.string :callback_key
      t.datetime :created_at
      t.datetime :updated_at
    end

    add_index :discourse_video_videos, :video_id, unique: true
  end
end
