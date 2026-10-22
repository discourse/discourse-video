# frozen_string_literal: true

describe DiscourseVideo do
  fab!(:video) { Fabricate(:video, state: DiscourseVideo::Video::READY) }

  before { enable_current_plugin }

  describe "post_process_cooked event" do
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
  end
end
