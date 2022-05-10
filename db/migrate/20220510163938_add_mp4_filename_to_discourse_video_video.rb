# frozen_string_literal: true

class AddMp4FilenameToDiscourseVideoVideo < ActiveRecord::Migration[7.0]
  def change
    add_column :discourse_video_videos, :mp4_filename, :string
  end
end
