module DiscourseVideo
  class UploadController < ::ApplicationController
    requires_plugin DiscourseVideo

    before_action :ensure_logged_in, :check_upload_permission, except: [:webhook]

    skip_before_action :check_xhr,
                      :preload_json,
                      :verify_authenticity_token,
                      :redirect_to_login_if_required,
                      only: [:webhook]

    def create
      hijack do
        begin
          result = MuxApi.create_direct_upload_2
          puts result
          video = DiscourseVideo::Video.new(
            video_id: result["data"]["id"],
            state: result["data"]["status"],
            user: current_user,
          )
          api_request_url = result["data"]["url"]
        ensure
          video.save!
        end

        render json: {
          video_id: video.video_id,
          api_request_url: api_request_url,
          state: video.state
        }
      end
    end

    def webhook
      data = JSON.parse(request.body.read)

      # Only process if it's a notification we care about

      if data["type"] == "video.upload.asset_created"
        upload_id = data["object"]["id"]
        video = DiscourseVideo::Video.find_by_video_id(upload_id)
        if video
          video.asset_id = data["data"]["asset_id"]
          video.state = DiscourseVideo::Video::PENDING
          video.save!
        end
      end

      if data["type"] == "video.asset.ready"
        asset_id = data["object"]["id"]
        video = DiscourseVideo::Video.find_by_asset_id(asset_id)
        if video
          video.playback_id = data["data"]["playback_ids"][0]["id"]
          video.state = DiscourseVideo::Video::READY
          video.save!
          video.update_post_custom_fields!
          video.publish_change_to_clients!
        end
      end

      render json: success_json

    end

    def check_upload_permission
      #raise Discourse::InvalidAccess unless guardian.can_upload_video?
    end

  end
end
