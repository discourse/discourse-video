# frozen_string_literal: true

module DiscourseVideo
  class VideoChatMessage < ActiveRecord::Base
    # Leaving off belongs_to because it is part of the discourse-chat plugin
    # and it might not be installed
    #
    #belongs_to :chat_message
  end
end

# == Schema Information
#
# Table name: discourse_video_video_chat_messages
#
#  id         :bigint           not null, primary key
#  message_id :integer          not null
#  video_info :string           not null
#  created_at :datetime
#  updated_at :datetime
#
