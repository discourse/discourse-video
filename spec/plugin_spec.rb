# frozen_string_literal: true

describe DiscourseVideo do
  fab!(:video) { Fabricate(:video, state: DiscourseVideo::Video::READY) }

  before { enable_current_plugin }

  describe "post_process_cooked event" do
    def published_video_changes(post)
      MessageBus
        .track_publish("/topic/#{post.topic_id}") { CookedPostProcessor.new(post).post_process }
        .select { |message| message.data[:type] == :discourse_video_video_changed }
    end

    it "tracks every video embedded in a post with a single lookup" do
      other_video = Fabricate(:video)
      post =
        Fabricate(
          :post,
          raw:
            "[video=#{video.video_id}] [video=#{other_video.video_id}] [video=unknown] [video=#{video.video_id}]",
        )

      queries = track_sql_queries { CookedPostProcessor.new(post).post_process }

      expect(DiscourseVideo::VideoPost.where(post:).pluck(:video_info)).to contain_exactly(
        video.video_info,
        other_video.video_info,
        video.video_info,
      )
      expect(queries.count { _1 =~ /FROM "?discourse_video_videos"?/ }).to eq(1)
    end

    it "publishes a change only when the post's video statuses change" do
      post = Fabricate(:post, raw: "No video yet")
      expect(published_video_changes(post)).to be_empty

      post.update!(raw: "[video=#{video.video_id}]")
      expect(published_video_changes(post).map { |message| message.data[:id] }).to eq([post.id])
      expect(published_video_changes(post)).to be_empty
    end
  end
end
