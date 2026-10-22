# frozen_string_literal: true

describe DiscourseVideo::UploadController do
  fab!(:user) { Fabricate(:user, trust_level: TrustLevel[1]) }
  fab!(:video) do
    Fabricate(:video, user: user, video_id: "HPL7WRiJV01jaMUC02PBLO8VLM3zigAqWYC3bhju8wd7s")
  end
  let(:asset_created_data) do
    "{\"type\":\"video.upload.asset_created\",\"request_id\":null,\"object\":{\"type\":\"upload\",\"id\":\"HPL7WRiJV01jaMUC02PBLO8VLM3zigAqWYC3bhju8wd7s\"},\"id\":\"fe518ca9-6845-4685-9f3b-d44d62462c14\",\"environment\":{\"name\":\"Development\",\"id\":\"km8j7v\"},\"data\":{\"timeout\":3600,\"test\":true,\"status\":\"asset_created\",\"new_asset_settings\":{\"playback_policies\":[\"public\"]},\"id\":\"HPL7WRiJV01jaMUC02PBLO8VLM3zigAqWYC3bhju8wd7s\",\"cors_origin\":\"*\",\"asset_id\":\"MYPDwHNwvPG11AtxzY9Oz01MP4XPs01r83OGBIfnholuk\"},\"created_at\":\"2021-06-10T04:02:13.000000Z\",\"attempts\":[],\"accessor_source\":null,\"accessor\":null}"
  end
  let(:ready_data) do
    "{\"type\":\"video.asset.ready\",\"request_id\":null,\"object\":{\"type\":\"asset\",\"id\":\"MYPDwHNwvPG11AtxzY9Oz01MP4XPs01r83OGBIfnholuk\"},\"id\":\"a71c5a45-0212-4b61-bac0-4e1821900bf3\",\"environment\":{\"name\":\"Development\",\"id\":\"km8j7v\"},\"data\":{\"upload_id\":\"HPL7WRiJV01jaMUC02PBLO8VLM3zigAqWYC3bhju8wd7s\",\"tracks\":[{\"type\":\"video\",\"max_width\":1280,\"max_height\":704,\"max_frame_rate\":59.649,\"id\":\"JziaHVw1vsRx986Typs8biCBA9NiA9dhCQpGuDCQ3fQ\",\"duration\":8.494833}],\"test\":true,\"status\":\"ready\",\"playback_ids\":[{\"policy\":\"public\",\"id\":\"cmXKFx1M6y5LmC00Nr02v3UFC2bCyTM4aGu43Yd4ZEFpU\"}],\"mp4_support\":\"none\",\"max_stored_resolution\":\"HD\",\"max_stored_frame_rate\":59.649,\"master_access\":\"none\",\"id\":\"MYPDwHNwvPG11AtxzY9Oz01MP4XPs01r83OGBIfnholuk\",\"duration\":8.583333,\"created_at\":1623297733,\"aspect_ratio\":\"20:11\"},\"created_at\":\"2021-06-10T04:02:15.000000Z\",\"attempts\":[],\"accessor_source\":null,\"accessor\":null}"
  end

  let(:static_renditions_data) do
    {
      type: "video.asset.static_renditions.ready",
      data: {
        upload_id: video.video_id,
        static_renditions: {
          status: "ready",
          files: [name: "low.mp4"],
        },
      },
    }.to_json
  end

  before do
    enable_current_plugin
    SiteSetting.discourse_video_mux_webhook_signing_secret = "test"
  end

  def mux_signature(payload)
    timestamp = 1234
    signature =
      OpenSSL::HMAC.hexdigest(
        OpenSSL::Digest.new("sha256"),
        SiteSetting.discourse_video_mux_webhook_signing_secret,
        "#{timestamp}.#{payload}",
      )

    "t=#{timestamp},v1=#{signature}"
  end

  def post_webhook(payload)
    post "/discourse_video/webhook",
         params: JSON.parse(payload),
         as: :json,
         headers: {
           "Mux-Signature" => mux_signature(payload),
         }
  end

  describe "#webhook" do
    it "Gives 403 error when request is not verified" do
      post "/discourse_video/webhook"

      expect(response.status).to eq(403)
    end

    it "acknowledges event types it does not handle" do
      post_webhook({ type: "video.asset.created" }.to_json)

      expect(response.status).to eq(200)
    end

    it "rejects ready events signed with the blank default secret" do
      SiteSetting.discourse_video_mux_webhook_signing_secret = ""

      post_webhook(ready_data)

      expect(response.status).to eq(403)
      expect(video.reload).to have_attributes(
        state: DiscourseVideo::Video::WAITING,
        playback_id: nil,
      )
    end

    it "changes status of video from verified requests" do
      expect do
        post_webhook(asset_created_data)
        video.reload
      end.to change { video.state }.from(DiscourseVideo::Video::WAITING).to(
        DiscourseVideo::Video::PENDING,
      )

      expect do
        post_webhook(ready_data)
        video.reload
      end.to change { video.state }.from(DiscourseVideo::Video::PENDING).to(
        DiscourseVideo::Video::READY,
      )
    end

    it "updates and publishes the remaining posts when a referencing post is trashed" do
      live_post = Fabricate(:post)
      trashed_post = Fabricate(:post, topic: live_post.topic)
      [live_post, trashed_post].each do |post|
        Fabricate(:video_post, post: post, video_info: "#{video.video_id}:pending")
      end
      trashed_post.trash!

      messages =
        MessageBus.track_publish("/topic/#{live_post.topic_id}") { post_webhook(ready_data) }

      expect(response.status).to eq(200)
      expect(DiscourseVideo::VideoPost.pluck(:video_info)).to all(eq(video.reload.video_info))
      expect(
        messages.filter_map { _1.data[:id] if _1.data[:type] == :discourse_video_video_changed },
      ).to contain_exactly(live_post.id)
    end

    it "leaves the posts of a video whose id starts with the ready video's id untouched" do
      other_video = Fabricate(:video, video_id: "#{video.video_id}2")
      other_video_post =
        Fabricate(:video_post, video_info: "#{other_video.video_id}:#{other_video.state}")

      messages =
        MessageBus.track_publish("/topic/#{other_video_post.post.topic_id}") do
          post_webhook(ready_data)
        end

      expect(response.status).to eq(200)
      expect(other_video_post.reload.video_info).to eq(other_video.video_info)
      expect(messages).to be_empty
    end

    it "accepts static_renditions.ready requests" do
      expect do
        post_webhook(static_renditions_data)
        video.reload
      end.to change { video.mp4_filename }.from(nil).to("low.mp4")
    end
  end
end
