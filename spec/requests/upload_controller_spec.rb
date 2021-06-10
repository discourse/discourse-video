# frozen_string_literal: true

require 'rails_helper'

describe DiscourseVideo::UploadController do
  before do
    SiteSetting.discourse_video_enabled = true
  end

  context "#webhook" do
    it 'Gives 403 error when request is not verified' do
      post "/discourse_video/webhook"

      expect(response.status).to eq(403)
    end
  end
end
