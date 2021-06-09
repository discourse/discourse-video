# frozen_string_literal: true

require 'rails_helper'

describe DiscourseVideo::UploadController do
  before { SiteSetting.discourse_video_mux_webhook_signing_secret = "test" }
  context "#webhook" do
    it 'Gives 403 error when request is not verified' do
      sign_in(Fabricate(:user))
      post "/discourse_video/webhook"

      expect(response.status).to eq(403)
    end
  end
end
