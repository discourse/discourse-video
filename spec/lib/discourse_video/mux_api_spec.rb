# frozen_string_literal: true
require "rails_helper"

describe DiscourseVideo::MuxApi do
  let(:url) { "https://api.mux.com/video/v1/uploads" }

  before do
    SiteSetting.discourse_video_mux_token_id = "987654321"
    SiteSetting.discourse_video_mux_token_secret = "abc"
  end

  describe "creating video with mp4 support" do
    before { SiteSetting.discourse_video_enable_mp4_download = true }

    body = {
      new_asset_settings: {
        playback_policy: ["public"],
        mp4_support: "standard",
      },
      cors_origin: "*",
    }

    let!(:creation_stub) do
      stub_request(:post, url).with(
        body: body.to_json,
        headers: {
          "Authorization" => "Basic OTg3NjU0MzIxOmFiYw==",
          "Content-Type" => "application/json",
          "Host" => "api.mux.com",
        },
      ).to_return(status: 200, body: {}.to_json, headers: {})
    end

    it "creates with mp4 support" do
      api = described_class.create_direct_upload
      expect(creation_stub).to have_been_requested.once
    end
  end

  describe "creating video without mp4 support" do
    before { SiteSetting.discourse_video_enable_mp4_download = false }

    body = {
      new_asset_settings: {
        playback_policy: ["public"],
        mp4_support: "none",
      },
      cors_origin: "*",
    }

    let!(:creation_stub) do
      stub_request(:post, url).with(
        body: body.to_json,
        headers: {
          "Authorization" => "Basic OTg3NjU0MzIxOmFiYw==",
          "Content-Type" => "application/json",
          "Host" => "api.mux.com",
        },
      ).to_return(status: 200, body: {}.to_json, headers: {})
    end

    it "creates without mp4 support" do
      api = described_class.create_direct_upload
      expect(creation_stub).to have_been_requested.once
    end
  end
end
