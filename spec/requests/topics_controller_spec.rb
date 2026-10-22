# frozen_string_literal: true

RSpec.describe TopicsController do
  fab!(:topic)
  fab!(:first_post) { Fabricate(:post, topic: topic) }
  fab!(:first_video_post) { Fabricate(:video_post, post: first_post) }

  before { enable_current_plugin }

  describe "#show" do
    it "serializes the videos of each post without a query per post" do
      second_video_posts = Fabricate.times(2, :video_post, post: Fabricate(:post, topic: topic))
      third_video_post = Fabricate(:video_post, post: Fabricate(:post, topic: topic))

      queries = track_sql_queries { get "/t/#{topic.id}.json" }

      expect(response.status).to eq(200)
      expect(response.parsed_body["post_stream"]["posts"].map { _1["discourse_video"] }).to eq(
        [
          [first_video_post.video_info],
          second_video_posts.map(&:video_info),
          [third_video_post.video_info],
        ],
      )
      expect(queries.filter { _1 =~ /FROM "?discourse_video_video_posts"?/ }.size).to eq(1)
    end

    it "omits videos when the plugin is disabled" do
      SiteSetting.discourse_video_enabled = false

      queries = track_sql_queries { get "/t/#{topic.id}.json" }

      expect(response.status).to eq(200)
      expect(response.parsed_body["post_stream"]["posts"].first).not_to have_key("discourse_video")
      expect(queries.filter { _1 =~ /FROM "?discourse_video_video_posts"?/ }).to be_empty
    end
  end
end
