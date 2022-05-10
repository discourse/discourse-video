# frozen_string_literal: true

require 'rails_helper'

def mux_signature(data)
  timestamp = 1234
  mux_header = "t=#{timestamp},v1="
  payload = "#{timestamp}.#{data}"
  signature = OpenSSL::HMAC.hexdigest(OpenSSL::Digest.new('sha256'), SiteSetting.discourse_video_mux_webhook_signing_secret, payload)

  "#{mux_header}#{signature}"
end

describe DiscourseVideo::UploadController do
  fab!(:user) { Fabricate(:user, trust_level: TrustLevel[1]) }
  fab!(:video) { Fabricate(:video, user: user, video_id: "HPL7WRiJV01jaMUC02PBLO8VLM3zigAqWYC3bhju8wd7s") }
  let(:asset_created_data) { "{\"type\":\"video.upload.asset_created\",\"request_id\":null,\"object\":{\"type\":\"upload\",\"id\":\"HPL7WRiJV01jaMUC02PBLO8VLM3zigAqWYC3bhju8wd7s\"},\"id\":\"fe518ca9-6845-4685-9f3b-d44d62462c14\",\"environment\":{\"name\":\"Development\",\"id\":\"km8j7v\"},\"data\":{\"timeout\":3600,\"test\":true,\"status\":\"asset_created\",\"new_asset_settings\":{\"playback_policies\":[\"public\"]},\"id\":\"HPL7WRiJV01jaMUC02PBLO8VLM3zigAqWYC3bhju8wd7s\",\"cors_origin\":\"*\",\"asset_id\":\"MYPDwHNwvPG11AtxzY9Oz01MP4XPs01r83OGBIfnholuk\"},\"created_at\":\"2021-06-10T04:02:13.000000Z\",\"attempts\":[],\"accessor_source\":null,\"accessor\":null}" }
  let(:ready_data) { "{\"type\":\"video.asset.ready\",\"request_id\":null,\"object\":{\"type\":\"asset\",\"id\":\"MYPDwHNwvPG11AtxzY9Oz01MP4XPs01r83OGBIfnholuk\"},\"id\":\"a71c5a45-0212-4b61-bac0-4e1821900bf3\",\"environment\":{\"name\":\"Development\",\"id\":\"km8j7v\"},\"data\":{\"upload_id\":\"HPL7WRiJV01jaMUC02PBLO8VLM3zigAqWYC3bhju8wd7s\",\"tracks\":[{\"type\":\"video\",\"max_width\":1280,\"max_height\":704,\"max_frame_rate\":59.649,\"id\":\"JziaHVw1vsRx986Typs8biCBA9NiA9dhCQpGuDCQ3fQ\",\"duration\":8.494833}],\"test\":true,\"status\":\"ready\",\"playback_ids\":[{\"policy\":\"public\",\"id\":\"cmXKFx1M6y5LmC00Nr02v3UFC2bCyTM4aGu43Yd4ZEFpU\"}],\"mp4_support\":\"none\",\"max_stored_resolution\":\"HD\",\"max_stored_frame_rate\":59.649,\"master_access\":\"none\",\"id\":\"MYPDwHNwvPG11AtxzY9Oz01MP4XPs01r83OGBIfnholuk\",\"duration\":8.583333,\"created_at\":1623297733,\"aspect_ratio\":\"20:11\"},\"created_at\":\"2021-06-10T04:02:15.000000Z\",\"attempts\":[],\"accessor_source\":null,\"accessor\":null}" }

  let(:static_renditions_data) { {
    type: "video.asset.static_renditions.ready",
    data: {
      upload_id: video.video_id,
      static_renditions: {
        status: "ready",
        files: [
          name: "low.mp4"
        ]
      }
    }
  }.to_json }

  before do
    SiteSetting.discourse_video_enabled = true
    SiteSetting.discourse_video_mux_webhook_signing_secret = "test"
  end

  context "#webhook" do
    it 'Gives 403 error when request is not verified' do
      post "/discourse_video/webhook"

      expect(response.status).to eq(403)
    end

    it 'allows only verified requests' do
      test_params = { "test" => "test" }

      post "/discourse_video/webhook", params: test_params, headers: { "Content-Type" => "aplication/json", "Mux-Signature" => mux_signature(JSON.generate(test_params)) }, as: :json
      expect(response.status).to eq(200)
    end

    it 'changes status of video from verified requests' do
      expect do
        post "/discourse_video/webhook", params: JSON.parse(asset_created_data), as: :json, headers: { "Content-Type" => "aplication/json", "Mux-Signature" => mux_signature(asset_created_data) }
        video.reload
      end.to change { video.state }.from(DiscourseVideo::Video::WAITING).to(DiscourseVideo::Video::PENDING)

      expect do
        post "/discourse_video/webhook", params: JSON.parse(ready_data), as: :json, headers: { "Content-Type" => "aplication/json", "Mux-Signature" => mux_signature(ready_data) }
        video.reload
      end.to change { video.state }.from(DiscourseVideo::Video::PENDING).to(DiscourseVideo::Video::READY)
    end

    it 'accepts static_renditions.ready requests' do
      expect do
        post "/discourse_video/webhook",
          params: JSON.parse(static_renditions_data),
          as: :json,
          headers: { "Content-Type" => "aplication/json", "Mux-Signature" => mux_signature(static_renditions_data) }
        video.reload
      end.to change { video.mp4_filename }.from(nil).to("low.mp4")
    end
  end
end
