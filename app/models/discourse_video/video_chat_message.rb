# frozen_string_literal: true

module DiscourseVideo
  class VideoChatMessage < ActiveRecord::Base
    # Leaving off belongs_to because it is part of the discourse-chat plugin
    # and it might not be installed
    #
    #belongs_to :chat_message
  end
end
