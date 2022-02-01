# frozen_string_literal: true

class CreateDiscourseVideoVideoPosts < ActiveRecord::Migration[6.1]
  def change
    create_table :discourse_video_video_posts do |t|
      t.integer :post_id, null: false
      t.string :video_info, null: false

      t.datetime :created_at
      t.datetime :updated_at
    end
  end
end

