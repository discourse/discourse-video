# frozen_string_literal: true

RSpec.describe "Discourse Video - chat message" do
  fab!(:current_user, :user)
  fab!(:channel, :chat_channel)
  fab!(:video) { Fabricate(:video, state: DiscourseVideo::Video::PENDING) }

  let(:chat_page) { PageObjects::Pages::Chat.new }
  let(:channel_page) { PageObjects::Pages::ChatChannel.new }
  let(:chat_videos) { PageObjects::Components::ChatMessageVideos.new }

  before do
    enable_current_plugin
    chat_system_bootstrap(current_user, [channel])
    sign_in(current_user)
  end

  it "shows each video with its status and updates it once ready" do
    errored_video = Fabricate(:video, state: DiscourseVideo::Video::ERRORED)
    Fabricate(
      :chat_message,
      chat_channel: channel,
      user: current_user,
      message:
        "[video=#{video.video_id}] [download-video=#{video.video_id}] [video=#{errored_video.video_id}] [video=unknown]",
      use_service: true,
    )

    mux_url = %r{\Ahttps://(image|stream)\.mux\.com/}
    page.driver.with_playwright_page do |playwright_page|
      playwright_page.route(mux_url, ->(route, _request) { route.abort })

      chat_page.visit_channel(channel)

      expect(chat_videos).to have_processing_video(video)
      expect(chat_videos).to have_errored_video(errored_video)

      video.update!(state: DiscourseVideo::Video::READY, playback_id: "playback123")
      video.publish_embed_changes!

      expect(chat_videos).to have_player(video)
      expect(chat_videos).to have_no_download_link

      chat_videos.tag_player(video)
      video.update!(mp4_filename: "high.mp4")
      video.publish_embed_changes!

      expect(chat_videos).to have_download_link(video)
      expect(chat_videos).to have_tagged_player(video)
      expect(chat_videos).to have_untouched_embed("unknown")
    ensure
      playwright_page.unroute(mux_url)
    end
  end

  it "inserts a video uploaded from the composer into the message" do
    DiscourseVideo::MuxApi.stubs(:create_direct_upload).returns(
      {
        "data" => {
          "id" => "uploaded123",
          "status" => DiscourseVideo::Video::WAITING,
          "url" => "https://storage.example.com/upload",
        },
      },
    )

    chat_page.visit_channel(channel)
    page.execute_script(<<~JS)
      window.UpChunk.createUpload = () => ({
        on: (event, callback) => event === "success" && setTimeout(callback),
      });
    JS
    channel_page.open_action_menu
    channel_page.click_action_button("discourse-video-upload")
    attach_file(
      "video-upload-input",
      file_from_fixtures("small.mp4", "media").path,
      make_visible: true,
    )
    within(".discourse-video-upload-modal") { click_button(I18n.t("js.upload")) }

    expect(channel_page.composer).to have_value("[video=uploaded123]")
  end
end
