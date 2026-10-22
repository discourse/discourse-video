# frozen_string_literal: true

describe DiscourseVideo::DisplayController do
  before { enable_current_plugin }

  describe "#get_playback_id" do
    it "returns the playback data and state of a video" do
      video =
        Fabricate(
          :video,
          state: DiscourseVideo::Video::READY,
          playback_id: "playback123",
          mp4_filename: "high.mp4",
        )

      get "/discourse_video/playback_id/#{video.video_id}.json"

      expect(response.status).to eq(200)
      expect(response.parsed_body).to eq(
        "playback_id" => "playback123",
        "mp4_filename" => "high.mp4",
        "state" => DiscourseVideo::Video::READY,
      )
    end

    it "returns null for an unknown video" do
      get "/discourse_video/playback_id/unknown.json"

      expect(response.status).to eq(200)
      expect(response.parsed_body).to be_nil
    end
  end
end
